import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
  .refine((v) => {
    const parsed = new Date(v);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
  }, "Tanggal tidak valid");
export const transactionSchema = z.object({
  project_id: z.uuid(),
  category_id: z.uuid("Pilih kategori/Sie"),
  type: z.enum(["income", "expense"]),
  transaction_date: date,
  amount: z
    .string()
    .regex(
      /^[1-9]\d{0,13}$/,
      "Nominal harus rupiah utuh, lebih dari nol, maksimal 14 digit",
    ),
  description: z.string().trim().min(1, "Isi keterangan transaksi").max(2000),
});
export const projectSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000),
    start_date: date,
    end_date: date,
    status: z.enum(["active", "completed", "archived"]),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "Tanggal akhir tidak boleh sebelum tanggal mulai",
    path: ["end_date"],
  });
export const categorySchema = z.object({
  project_id: z.uuid(),
  name: z.string().trim().min(1).max(80),
});
export const adminSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(12, "Kata sandi minimal 12 karakter").max(128),
});
export const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const MAX_PROOF_SIZE = 4 * 1024 * 1024;
export function proofExtension(bytes: Uint8Array, declared: string) {
  if (
    declared === "image/jpeg" &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "jpg";
  if (
    declared === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "png";
  if (
    declared === "application/pdf" &&
    [37, 80, 68, 70, 45].every((v, i) => bytes[i] === v)
  )
    return "pdf";
  throw new Error("Bukti harus berupa JPG, PNG, atau PDF yang valid.");
}
