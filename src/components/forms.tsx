"use client";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Paperclip } from "lucide-react";
import {
  saveAdmin,
  saveCategory,
  saveProject,
  saveTransaction,
} from "@/app/actions";
import { Field, Form } from "./ui";
import { rupiah, today } from "@/lib/format";
import { MAX_PROOF_SIZE } from "@/lib/validation";
import type { Category, Profile, Project, Transaction } from "@/lib/types";
type Shared = { onSuccess: () => void; preview?: boolean };
export function TransactionForm({
  project,
  categories,
  transaction,
  type = "income",
  onSuccess,
  preview,
}: Shared & {
  project: Project;
  categories: Category[];
  transaction?: Transaction;
  type?: "income" | "expense";
}) {
  const [kind, setKind] = useState(transaction?.type ?? type),
    [amount, setAmount] = useState(transaction?.amount.split(".")[0] ?? ""),
    [filename, setFilename] = useState("");
  return (
    <Form
      action={saveTransaction}
      onSuccess={onSuccess}
      preview={preview}
      label={transaction ? "Simpan perubahan" : "Simpan transaksi"}
    >
      <input type="hidden" name="id" value={transaction?.id ?? ""} />
      <input type="hidden" name="project_id" value={project.id} />
      <input type="hidden" name="type" value={kind} />
      <input type="hidden" name="amount" value={amount} />
      <p className="muted form-intro">
        Buku kas <strong>{project.name}</strong>
      </p>
      <div className="segmented">
        <button
          type="button"
          onClick={() => setKind("income")}
          className={kind === "income" ? "selected income" : ""}
        >
          <ArrowDownLeft size={17} /> Pemasukan
        </button>
        <button
          type="button"
          onClick={() => setKind("expense")}
          className={kind === "expense" ? "selected expense" : ""}
        >
          <ArrowUpRight size={17} /> Pengeluaran
        </button>
      </div>
      <label className={`amount-field ${kind}`}>
        <span>Nominal transaksi</span>
        <div>
          <span>Rp</span>
          <input
            aria-label="Nominal transaksi"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={amount ? BigInt(amount).toLocaleString("id-ID") : ""}
            onChange={(e) =>
              setAmount(
                e.target.value
                  .replace(/\D/g, "")
                  .replace(/^0+/, "")
                  .slice(0, 14),
              )
            }
            required
          />
        </div>
        <small>Rupiah utuh, tanpa desimal</small>
      </label>
      <div className="quick-amounts">
        {[100000n, 500000n, 1000000n].map((v) => (
          <button
            type="button"
            key={String(v)}
            onClick={() => {
              const next = BigInt(amount || "0") + v;
              if (next <= 99999999999999n) setAmount(String(next));
            }}
          >
            +{rupiah(v)}
          </button>
        ))}
      </div>
      <Field label="Kategori / Sie">
        <select
          name="category_id"
          defaultValue={transaction?.category_id ?? ""}
          required
        >
          <option value="" disabled>
            Pilih kategori / Sie
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      {!categories.length && (
        <div className="notice">
          Tambahkan kategori/Sie terlebih dahulu melalui menu Kategori.
        </div>
      )}
      <Field label="Tanggal transaksi">
        <input
          type="date"
          name="transaction_date"
          defaultValue={transaction?.transaction_date ?? today()}
          required
        />
      </Field>
      <Field label="Keterangan">
        <textarea
          name="description"
          defaultValue={transaction?.description}
          placeholder="Contoh: Dana awal kegiatan dari Pengurus Pemuda"
          maxLength={2000}
          rows={3}
          required
        />
      </Field>
      <Field
        label="Bukti transaksi · opsional"
        hint="JPG, PNG, atau PDF. Maksimal 4 MB."
      >
        <span className="upload">
          <Paperclip size={23} />
          <span>{filename || "Pilih foto atau dokumen"}</span>
          <input
            type="file"
            name="proof"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFilename(file?.name ?? "");
              e.target.setCustomValidity(
                file && file.size > MAX_PROOF_SIZE
                  ? "Ukuran bukti maksimal 4 MB."
                  : "",
              );
              e.target.reportValidity();
            }}
          />
        </span>
      </Field>
      {transaction?.proof_path && (
        <label className="checkbox">
          <input type="checkbox" name="remove_proof" /> Hapus bukti lama (jika
          tidak diganti)
        </label>
      )}
    </Form>
  );
}
export function ProjectForm({
  project,
  onSuccess,
  preview,
}: Shared & { project?: Project }) {
  return (
    <Form
      action={saveProject}
      preview={preview}
      onSuccess={onSuccess}
      label={project ? "Simpan proyek" : "Buat proyek"}
    >
      <input type="hidden" name="id" value={project?.id ?? ""} />
      <Field label="Nama proyek">
        <input
          name="name"
          defaultValue={project?.name}
          placeholder="Contoh: CLC 2026"
          minLength={2}
          maxLength={100}
          required
        />
      </Field>
      <Field label="Deskripsi">
        <textarea
          name="description"
          defaultValue={project?.description}
          placeholder="Tentang kegiatan ini"
          maxLength={1000}
          rows={3}
        />
      </Field>
      <div className="form-grid">
        <Field label="Tanggal mulai">
          <input
            type="date"
            name="start_date"
            defaultValue={project?.start_date ?? today()}
            required
          />
        </Field>
        <Field label="Tanggal selesai">
          <input
            type="date"
            name="end_date"
            defaultValue={project?.end_date ?? today()}
            required
          />
        </Field>
      </div>
      <Field label="Status">
        <select name="status" defaultValue={project?.status ?? "active"}>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
        </select>
      </Field>
    </Form>
  );
}
export function CategoryForm({
  project,
  category,
  onSuccess,
  preview,
}: Shared & { project: Project; category?: Category }) {
  return (
    <Form action={saveCategory} preview={preview} onSuccess={onSuccess}>
      <input type="hidden" name="project_id" value={project.id} />
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <Field
        label="Nama kategori / Sie"
        hint="Bisa digunakan untuk pemasukan maupun pengeluaran."
      >
        <input
          name="name"
          defaultValue={category?.name}
          placeholder="Contoh: Pengurus"
          maxLength={80}
          required
        />
      </Field>
    </Form>
  );
}
export function AdminForm({
  admin,
  onSuccess,
  preview,
}: Shared & { admin?: Profile }) {
  return (
    <Form
      action={saveAdmin}
      preview={preview}
      onSuccess={onSuccess}
      label={admin ? "Simpan Admin" : "Buat akun Admin"}
    >
      <input type="hidden" name="id" value={admin?.id ?? ""} />
      <Field label="Nama lengkap">
        <input
          name="full_name"
          defaultValue={admin?.full_name}
          minLength={2}
          maxLength={100}
          required
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          name="email"
          autoComplete="off"
          defaultValue={admin?.email}
          required
        />
      </Field>
      <Field
        label={admin ? "Kata sandi baru · opsional" : "Kata sandi"}
        hint={
          admin
            ? "Kosongkan untuk mempertahankan kata sandi. Minimal 12 karakter jika diganti."
            : "Minimal 12 karakter. Berikan akses akun kepada Admin secara pribadi."
        }
      >
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required={!admin}
        />
      </Field>
    </Form>
  );
}
