import "server-only";
import { redirect, notFound } from "next/navigation";
import { db, configured, serviceDb } from "./supabase/server";
import type {
  Profile,
  Workspace,
  Project,
  Category,
  Transaction,
  ShareLink,
  Assignment,
} from "./types";
import { tokenSchema } from "./validation";
export async function currentUser() {
  if (!configured()) redirect("/login");
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await client
    .from("profiles")
    .select("id,full_name,email,role,is_active")
    .eq("id", user.id)
    .single();
  if (error || !data?.is_active) redirect("/login?inactive=1");
  return { client, profile: data as Profile };
}
export async function requireMaster() {
  const session = await currentUser();
  if (session.profile.role !== "master_admin")
    throw new Error("Hanya Master Admin yang dapat melakukan tindakan ini.");
  return session;
}
export async function projectAccess(id: string, write = false) {
  const session = await currentUser();
  const { data, error } = await session.client
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data)
    throw new Error("Proyek tidak ditemukan atau Anda tidak memiliki akses.");
  if (write && data.status === "archived")
    throw new Error("Proyek diarsipkan. Buka kembali sebelum mengubah data.");
  return { ...session, project: data as Project };
}
// Explicit paging avoids Supabase's default 1,000-row truncation in balances.
export async function allRows<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}
export async function workspace(): Promise<Workspace> {
  const { client, profile } = await currentUser();
  const [projects, categories, transactions, links, profiles, assignments] =
    await Promise.all([
      allRows<Project>((a, b) =>
        client
          .from("projects")
          .select("id,name,description,start_date,end_date,status")
          .order("id")
          .range(a, b),
      ),
      allRows<Category>((a, b) =>
        client
          .from("categories")
          .select("id,project_id,name")
          .order("id")
          .range(a, b),
      ),
      allRows<Transaction>((a, b) =>
        client
          .from("transactions")
          .select(
            "id,project_id,category_id,type,transaction_date,amount,description,proof_path,created_at,updated_at",
          )
          .order("id")
          .range(a, b),
      ),
      allRows<ShareLink>((a, b) =>
        client
          .from("share_links")
          .select("id,project_id,token,is_active,show_proof,created_at")
          .order("id")
          .range(a, b),
      ),
      allRows<Profile>((a, b) =>
        client
          .from("profiles")
          .select("id,full_name,email,role,is_active")
          .order("id")
          .range(a, b),
      ),
      allRows<Assignment>((a, b) =>
        client
          .from("project_admins")
          .select("project_id,admin_id")
          .order("id")
          .range(a, b),
      ),
    ]);
  return {
    profile,
    projects,
    categories,
    transactions: transactions.map((t) => ({ ...t, amount: String(t.amount) })),
    links,
    profiles,
    assignments,
  };
}
export async function publicReport(token: string) {
  if (!configured() || !tokenSchema.safeParse(token).success) notFound();
  const client = serviceDb();
  const { data: link } = await client
    .from("share_links")
    .select("project_id,show_proof")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();
  if (!link) notFound();
  const { data: project } = await client
    .from("projects")
    .select("id,name,description,start_date,end_date,status")
    .eq("id", link.project_id)
    .single();
  if (!project) notFound();
  const [categories, transactions] = await Promise.all([
    allRows<Category>((a, b) =>
      client
        .from("categories")
        .select("id,project_id,name")
        .eq("project_id", project.id)
        .order("id")
        .range(a, b),
    ),
    allRows<Transaction>((a, b) =>
      client
        .from("transactions")
        .select(
          "id,project_id,category_id,type,transaction_date,amount,description,proof_path,created_at,updated_at",
        )
        .eq("project_id", project.id)
        .order("id")
        .range(a, b),
    ),
  ]);
  // Never serialize storage keys to the public UI; only expose availability.
  return {
    project: project as Project,
    categories,
    transactions: transactions.map((t) => ({
      ...t,
      amount: String(t.amount),
      proof_path:
        link.show_proof && t.proof_path
          ? t.proof_path.toLowerCase().endsWith(".pdf")
            ? "available.pdf"
            : "available.image"
          : null,
    })),
  };
}
