import type { Transaction } from "./types";
export function rupiah(value: string | bigint | number) {
  const integer =
    typeof value === "bigint"
      ? value
      : BigInt(String(value).split(".")[0] || "0");
  return `${integer < 0n ? "−" : ""}Rp${(integer < 0n ? -integer : integer).toLocaleString("id-ID")}`;
}
export function totals(rows: Pick<Transaction, "amount" | "type">[]) {
  let income = 0n,
    expense = 0n;
  for (const row of rows) {
    const amount = BigInt(String(row.amount).split(".")[0]);
    if (row.type === "income") income += amount;
    else expense += amount;
  }
  return { income, expense, balance: income - expense };
}
export function dateLabel(value: string, long = false) {
  if (!value) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+08:00`));
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export const statusLabel = {
  active: "Aktif",
  completed: "Selesai",
  archived: "Diarsipkan",
};
