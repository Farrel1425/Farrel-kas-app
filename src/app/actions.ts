"use server";
import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, configured, serviceDb } from "@/lib/supabase/server";
import { currentUser, projectAccess, requireMaster } from "@/lib/data";
import {
  adminSchema,
  categorySchema,
  MAX_PROOF_SIZE,
  projectSchema,
  proofExtension,
  transactionSchema,
} from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

const value = (f: FormData, k: string) => String(f.get(k) ?? "");
const idValue = (f: FormData, k = "id") => z.uuid().parse(value(f, k));
function check(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === "23503")
    throw new Error(
      "Kategori masih digunakan transaksi dan tidak bisa dihapus.",
    );
  if (error.code === "23505")
    throw new Error("Data dengan nama atau email tersebut sudah ada.");
  throw new Error(
    "Data gagal disimpan. Periksa akses dan koneksi, lalu coba lagi.",
  );
}
async function run(action: () => Promise<void>): Promise<ActionResult> {
  try {
    await action();
    revalidatePath("/", "layout");
    return { ok: true, message: "Perubahan berhasil disimpan." };
  } catch (error) {
    if (error instanceof z.ZodError)
      return { ok: false, message: error.issues[0].message };
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT"))
      throw error;
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan. Coba lagi.",
    };
  }
}
export async function login(form: FormData): Promise<ActionResult> {
  if (!configured())
    return {
      ok: false,
      message:
        "Koneksi Supabase belum disiapkan. Ikuti panduan pengaturan proyek.",
    };
  const email = z.email().safeParse(value(form, "email"));
  if (!email.success)
    return { ok: false, message: "Masukkan email yang valid." };
  const client = await db();
  const { error } = await client.auth.signInWithPassword({
    email: email.data,
    password: value(form, "password"),
  });
  if (error)
    return {
      ok: false,
      message: "Email atau kata sandi tidak sesuai. Silakan coba kembali.",
    };
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data: profile } = await client
    .from("profiles")
    .select("is_active")
    .eq("id", user!.id)
    .single();
  if (!profile?.is_active) {
    await client.auth.signOut();
    return { ok: false, message: "Akun dinonaktifkan. Hubungi Master Admin." };
  }
  redirect("/dashboard");
}
export async function logout() {
  const client = await db();
  await client.auth.signOut();
  redirect("/login");
}

export async function saveProject(form: FormData) {
  return run(async () => {
    const { client, profile } = await requireMaster();
    const fields = projectSchema.parse(Object.fromEntries(form));
    const id = value(form, "id");
    if (id) {
      const { project } = await projectAccess(z.uuid().parse(id));
      if (project.status === "archived")
        throw new Error("Buka kembali proyek sebelum mengeditnya.");
      const { error } = await client
        .from("projects")
        .update(fields)
        .eq("id", id)
        .select("id")
        .single();
      check(error);
    } else {
      const { error } = await client
        .from("projects")
        .insert({ ...fields, created_by: profile.id });
      check(error);
    }
  });
}
export async function setProjectStatus(form: FormData) {
  return run(async () => {
    const { client } = await requireMaster();
    const id = idValue(form);
    const status = z
      .enum(["active", "completed", "archived"])
      .parse(value(form, "status"));
    const { error } = await client
      .from("projects")
      .update({ status })
      .eq("id", id)
      .select("id")
      .single();
    check(error);
  });
}
export async function saveCategory(form: FormData) {
  return run(async () => {
    const fields = categorySchema.parse(Object.fromEntries(form));
    const { client } = await projectAccess(fields.project_id, true);
    const id = value(form, "id");
    if (id) {
      const { error } = await client
        .from("categories")
        .update({ name: fields.name })
        .eq("id", z.uuid().parse(id))
        .eq("project_id", fields.project_id)
        .select("id")
        .single();
      check(error);
    } else {
      const { error } = await client.from("categories").insert(fields);
      check(error);
    }
  });
}
export async function deleteCategory(form: FormData) {
  return run(async () => {
    const { client } = await projectAccess(idValue(form, "project_id"), true);
    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", idValue(form))
      .eq("project_id", value(form, "project_id"))
      .select("id")
      .single();
    check(error);
  });
}
export async function saveTransaction(form: FormData) {
  return run(async () => {
    const fields = transactionSchema.parse(Object.fromEntries(form));
    const { client, profile } = await projectAccess(fields.project_id, true);
    const editing = Boolean(value(form, "id"));
    const id = editing ? idValue(form) : randomUUID();
    let oldProof: string | null = null;
    if (editing) {
      const { data, error } = await client
        .from("transactions")
        .select("proof_path")
        .eq("id", id)
        .eq("project_id", fields.project_id)
        .single();
      check(error);
      oldProof = data?.proof_path ?? null;
    }
    const file = form.get("proof");
    let bytes: Uint8Array | undefined;
    let ext: string | undefined;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PROOF_SIZE)
        throw new Error("Ukuran bukti maksimal 4 MB.");
      bytes = new Uint8Array(await file.arrayBuffer());
      ext = proofExtension(bytes, file.type);
    }
    if (!editing) {
      const { error } = await client
        .from("transactions")
        .insert({ ...fields, id, created_by: profile.id });
      check(error);
    }
    let newProof: string | null = null;
    try {
      if (bytes && ext && file instanceof File) {
        newProof = `transactions/${fields.project_id}/${id}/${randomUUID()}.${ext}`;
        const { error } = await client.storage
          .from("transaction-proofs")
          .upload(newProof, bytes, { contentType: file.type, upsert: false });
        check(error);
      }
      const proof_path =
        newProof ?? (form.get("remove_proof") === "on" ? null : oldProof);
      const { error } = await client
        .from("transactions")
        .update({
          category_id: fields.category_id,
          type: fields.type,
          transaction_date: fields.transaction_date,
          amount: fields.amount,
          description: fields.description,
          proof_path,
        })
        .eq("id", id)
        .eq("project_id", fields.project_id)
        .select("id")
        .single();
      check(error);
      if (oldProof && oldProof !== proof_path)
        await client.storage.from("transaction-proofs").remove([oldProof]);
    } catch (error) {
      if (newProof)
        await client.storage.from("transaction-proofs").remove([newProof]);
      if (!editing) await client.from("transactions").delete().eq("id", id);
      throw error;
    }
  });
}
export async function deleteTransaction(form: FormData) {
  return run(async () => {
    const { client } = await projectAccess(idValue(form, "project_id"), true);
    const id = idValue(form);
    const { data, error } = await client
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("project_id", value(form, "project_id"))
      .select("proof_path")
      .single();
    check(error);
    // The private object becomes inaccessible after deleting its transaction.
    // Best-effort cleanup uses server credentials only after the authorized deletion.
    if (data?.proof_path && process.env.SUPABASE_SERVICE_ROLE_KEY)
      await serviceDb()
        .storage.from("transaction-proofs")
        .remove([data.proof_path]);
  });
}
export async function createShare(form: FormData) {
  return run(async () => {
    const project_id = idValue(form, "project_id");
    const { client, profile } = await projectAccess(project_id, true);
    const { error } = await client.from("share_links").insert({
      project_id,
      token: randomBytes(32).toString("hex"),
      show_proof: form.get("show_proof") === "on",
      created_by: profile.id,
    });
    check(error);
  });
}
export async function updateShare(form: FormData) {
  return run(async () => {
    const project_id = idValue(form, "project_id");
    const { client } = await projectAccess(project_id, true);
    const { error } = await client
      .from("share_links")
      .update({
        is_active: form.get("is_active") === "on",
        show_proof: form.get("show_proof") === "on",
      })
      .eq("id", idValue(form))
      .eq("project_id", project_id)
      .select("id")
      .single();
    check(error);
  });
}
export async function saveAdmin(form: FormData) {
  return run(async () => {
    await requireMaster();
    const client = serviceDb();
    const id = value(form, "id");
    if (!id) {
      const fields = adminSchema.parse(Object.fromEntries(form));
      const { error } = await client.auth.admin.createUser({
        email: fields.email,
        password: fields.password,
        email_confirm: true,
        user_metadata: { full_name: fields.full_name },
      });
      check(error);
    } else {
      z.uuid().parse(id);
      const full_name = z
        .string()
        .trim()
        .min(2)
        .max(100)
        .parse(value(form, "full_name"));
      const email = z.email().parse(value(form, "email"));
      const { data: target } = await client
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();
      if (target?.role !== "admin")
        throw new Error("Akun Master Admin tidak diubah melalui menu ini.");
      const password = value(form, "password");
      if (password) z.string().min(12).max(128).parse(password);
      const { error } = await client.auth.admin.updateUserById(id, {
        email,
        ...(password ? { password } : {}),
        user_metadata: { full_name },
      });
      check(error);
    }
  });
}
export async function setAdminActive(form: FormData) {
  return run(async () => {
    await requireMaster();
    const client = serviceDb();
    const id = idValue(form);
    const is_active = form.get("is_active") === "on";
    const { error } = await client
      .from("profiles")
      .update({ is_active })
      .eq("id", id)
      .eq("role", "admin")
      .select("id")
      .single();
    check(error);
  });
}
export async function setAssignment(form: FormData) {
  return run(async () => {
    const { client } = await requireMaster();
    const project_id = idValue(form, "project_id"),
      admin_id = idValue(form, "admin_id");
    await projectAccess(project_id, true);
    const { data: admin } = await client
      .from("profiles")
      .select("role,is_active")
      .eq("id", admin_id)
      .single();
    if (admin?.role !== "admin") throw new Error("Pilih akun Admin.");
    if (form.get("assigned") === "on") {
      if (!admin.is_active)
        throw new Error("Aktifkan Admin sebelum menugaskannya.");
      const { error } = await client
        .from("project_admins")
        .insert({ project_id, admin_id });
      check(error);
    } else {
      const { error } = await client
        .from("project_admins")
        .delete()
        .eq("project_id", project_id)
        .eq("admin_id", admin_id);
      check(error);
    }
  });
}
export async function checkSession() {
  const { profile } = await currentUser();
  return { name: profile.full_name };
}
