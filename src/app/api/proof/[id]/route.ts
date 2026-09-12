import { NextRequest, NextResponse } from "next/server";
import { db, serviceDb, configured } from "@/lib/supabase/server";
import { tokenSchema } from "@/lib/validation";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const missing = () =>
    new NextResponse("Bukti tidak tersedia atau akses telah ditutup.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  try {
    const { id } = await params;
    if (!configured() || !z.uuid().safeParse(id).success) return missing();
    const token = request.nextUrl.searchParams.get("token");
    const client = token ? serviceDb() : await db();
    let projectId: string | undefined;
    if (token) {
      if (!tokenSchema.safeParse(token).success) return missing();
      const { data } = await client
        .from("share_links")
        .select("project_id")
        .eq("token", token)
        .eq("is_active", true)
        .eq("show_proof", true)
        .maybeSingle();
      if (!data) return missing();
      projectId = data.project_id;
    } else {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return missing();
    }
    let query = client
      .from("transactions")
      .select("proof_path,project_id")
      .eq("id", id);
    if (projectId) query = query.eq("project_id", projectId);
    const { data: transaction } = await query.maybeSingle();
    if (!transaction?.proof_path) return missing();
    const ext = transaction.proof_path.split(".").pop();
    const download = request.nextUrl.searchParams.get("download") === "1";
    const filename = `bukti-${id}.${ext ?? "file"}`;
    const { data: signed, error } = await client.storage
      .from("transaction-proofs")
      .createSignedUrl(transaction.proof_path, 300, {
        download: download ? filename : false,
      });
    if (error || !signed?.signedUrl) return missing();
    const response = NextResponse.redirect(signed.signedUrl, 307);
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch {
    return missing();
  }
}
