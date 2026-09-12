"use client";
/* eslint-disable @next/next/no-img-element -- Private evidence is served through an authenticated, no-store proxy. */
import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Search,
  SlidersHorizontal,
  Paperclip,
  CalendarDays,
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { dateLabel, rupiah, totals } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";
import { Empty, Modal } from "./ui";
export function FinancialSummary({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const sum = totals(transactions);
  return (
    <div className="public-summary">
      <div>
        <span>
          <ArrowDownLeft size={17} /> Total pemasukan
        </span>
        <strong className="income">{rupiah(sum.income)}</strong>
        <small>
          {transactions.filter((t) => t.type === "income").length} transaksi
          masuk
        </small>
      </div>
      <div>
        <span>
          <ArrowUpRight size={17} /> Total pengeluaran
        </span>
        <strong className="expense">{rupiah(sum.expense)}</strong>
        <small>
          {transactions.filter((t) => t.type === "expense").length} transaksi
          keluar
        </small>
      </div>
      <div>
        <span>Saldo saat ini</span>
        <strong className={sum.balance < 0n ? "expense" : "blue"}>
          {rupiah(sum.balance)}
        </strong>
        <small>{sum.balance < 0n ? "Saldo minus" : "Total kas proyek"}</small>
      </div>
    </div>
  );
}
export function Ledger({
  transactions,
  categories,
  onSelect,
  compact = false,
}: {
  transactions: Transaction[];
  categories: Category[];
  onSelect: (t: Transaction) => void;
  compact?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [type, setType] = useState("all"),
    [category, setCategory] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filters, setFilters] = useState(false),
    [page, setPage] = useState(0);
  const filtered = transactions
    .filter(
      (t) =>
        (type === "all" || t.type === type) &&
        (!category || t.category_id === category) &&
        (!from || t.transaction_date >= from) &&
        (!to || t.transaction_date <= to) &&
        `${t.description} ${categories.find((c) => c.id === t.category_id)?.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) ||
        b.created_at.localeCompare(a.created_at) ||
        b.id.localeCompare(a.id),
    );
  const maxPage = Math.max(0, Math.ceil(filtered.length / 12) - 1),
    safePage = Math.min(page, maxPage),
    shown = compact
      ? filtered.slice(0, 5)
      : filtered.slice(safePage * 12, safePage * 12 + 12),
    sum = totals(filtered);
  return (
    <div className="ledger">
      {!compact && (
        <>
          <div className="ledger-toolbar">
            <label className="search">
              <Search size={19} />
              <input
                aria-label="Cari transaksi"
                placeholder="Cari keterangan atau kategori…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <button
              className={`button secondary ${filters ? "filter-active" : ""}`}
              onClick={() => setFilters(!filters)}
            >
              <SlidersHorizontal size={17} /> Filter{" "}
              <span className="hide-mobile">& tanggal</span>
              {(category || from || to) && <i className="dot" />}
            </button>
          </div>
          <div className="filter-chips">
            {[
              ["all", "Semua transaksi"],
              ["income", "Pemasukan"],
              ["expense", "Pengeluaran"],
            ].map(([v, l]) => (
              <button
                className={type === v ? "active" : ""}
                key={v}
                onClick={() => {
                  setType(v);
                  setPage(0);
                }}
              >
                {v === "income" && <ArrowDownLeft size={15} />}{" "}
                {v === "expense" && <ArrowUpRight size={15} />} {l}
              </button>
            ))}
          </div>
          {filters && (
            <div className="filter-panel">
              <label>
                Kategori/Sie
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="">Semua kategori</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Dari tanggal
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Sampai tanggal
                <input
                  type="date"
                  min={from}
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setCategory("");
                  setFrom("");
                  setTo("");
                  setSearch("");
                  setType("all");
                  setPage(0);
                }}
              >
                Reset filter
              </button>
            </div>
          )}
          <div className="results-line">
            <span>
              {filtered.length} transaksi
              {category || from || to || search || type !== "all"
                ? " sesuai filter"
                : " tercatat"}
            </span>
            <span>
              Masuk <b className="income">{rupiah(sum.income)}</b>
              <span className="result-divider">·</span> Keluar{" "}
              <b className="expense">{rupiah(sum.expense)}</b>
            </span>
          </div>
        </>
      )}
      <div className="ledger-columns">
        <span>TRANSAKSI</span>
        <span>KATEGORI / SIE</span>
        <span>NOMINAL</span>
        <span />
      </div>
      {!shown.length ? (
        <Empty
          title="Belum ada transaksi"
          description={
            transactions.length
              ? "Tidak ada transaksi yang sesuai pencarian atau filter Anda."
              : "Catat pemasukan atau pengeluaran pertama untuk memulai buku kas."
          }
        />
      ) : (
        shown.map((t) => (
          <button
            type="button"
            className="transaction-row"
            key={t.id}
            onClick={() => onSelect(t)}
          >
            <span className={`transaction-icon ${t.type}`}>
              {t.type === "income" ? (
                <ArrowDownLeft size={22} />
              ) : (
                <ArrowUpRight size={22} />
              )}
            </span>
            <span className="transaction-text">
              <strong>{t.description}</strong>
              <small>
                {dateLabel(t.transaction_date)}{" "}
                <span className="mobile-category">
                  · {categories.find((c) => c.id === t.category_id)?.name}
                </span>
                {t.proof_path && <Paperclip size={12} />}
              </small>
            </span>
            <span className="transaction-category">
              <span className="badge neutral">
                {categories.find((c) => c.id === t.category_id)?.name ??
                  "Kategori"}
              </span>
            </span>
            <span className={`transaction-amount ${t.type}`}>
              <strong>
                {t.type === "income" ? "+" : "−"}
                {rupiah(t.amount)}
              </strong>
              <small>{t.type === "income" ? "Pemasukan" : "Pengeluaran"}</small>
            </span>
            <ChevronRight size={16} className="row-chevron" />
          </button>
        ))
      )}
      {!compact && filtered.length > 12 && (
        <div className="pagination">
          <span>
            Halaman {safePage + 1} dari {maxPage + 1}
          </span>
          <div>
            <button
              className="icon-button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              disabled={safePage === maxPage}
              onClick={() => setPage(safePage + 1)}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function TransactionDetail({
  transaction: t,
  category,
  onEdit,
  onDelete,
  token,
  preview = false,
}: {
  transaction: Transaction;
  category?: Category;
  onEdit?: () => void;
  onDelete?: () => void;
  token?: string;
  preview?: boolean;
}) {
  const [proof, setProof] = useState(false),
    [broken, setBroken] = useState(false);
  const proofUrl = `/api/proof/${t.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  const downloadUrl = `${proofUrl}${proofUrl.includes("?") ? "&" : "?"}download=1`;
  return (
    <>
      <div className={`detail-amount ${t.type}`}>
        <span className={`badge ${t.type}`}>
          {t.type === "income" ? (
            <ArrowDownLeft size={14} />
          ) : (
            <ArrowUpRight size={14} />
          )}{" "}
          {t.type === "income" ? "Pemasukan" : "Pengeluaran"}
        </span>
        <strong>
          {t.type === "income" ? "+" : "−"}
          {rupiah(t.amount)}
        </strong>
        <p>{t.description}</p>
      </div>
      <dl className="detail-list">
        <div>
          <dt>
            <CalendarDays size={16} /> Tanggal transaksi
          </dt>
          <dd>{dateLabel(t.transaction_date, true)}</dd>
        </div>
        <div>
          <dt>Kategori / Sie</dt>
          <dd>
            <span className="badge neutral">
              {category?.name ?? "Kategori"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Keterangan</dt>
          <dd className="preserve-lines">{t.description}</dd>
        </div>
        <div>
          <dt>
            <Paperclip size={16} /> Bukti transaksi
          </dt>
          <dd>
            {t.proof_path ? (
              <button
                className="button secondary"
                onClick={() => setProof(true)}
              >
                <Eye size={16} /> Lihat bukti <ArrowRight size={15} />
              </button>
            ) : (
              <span className="muted">Bukti tidak tersedia.</span>
            )}
          </dd>
        </div>
      </dl>
      {token && (
        <div className="notice">
          <Eye size={19} />
          <span>
            Ini adalah laporan publik. Data hanya dapat dilihat dan tidak dapat
            diubah.
          </span>
        </div>
      )}
      {(onEdit || onDelete) && (
        <div className="detail-actions">
          {onEdit && (
            <button className="button primary" onClick={onEdit}>
              <Pencil size={16} /> Edit transaksi
            </button>
          )}
          {onDelete && (
            <button className="button danger" onClick={onDelete}>
              <Trash2 size={16} /> Hapus
            </button>
          )}
        </div>
      )}
      {proof && (
        <Modal title="Bukti transaksi" onClose={() => setProof(false)} wide>
          {preview ? (
            <Empty
              title="Bukti contoh tidak dilampirkan"
              description="Bukti asli akan tersedia untuk transaksi yang memiliki unggahan."
            />
          ) : broken ? (
            <Empty
              title="Bukti tidak tersedia"
              description="Berkas tidak ditemukan atau aksesnya telah ditutup."
            />
          ) : (
            <>
              <p className="muted">
                {dateLabel(t.transaction_date)} · {rupiah(t.amount)}
              </p>
              {t.proof_path?.endsWith(".pdf") ? (
                <div className="proof-preview">
                  <iframe
                    className="proof-frame"
                    src={proofUrl}
                    title="Bukti transaksi dalam format PDF"
                  />
                  <a
                    href={downloadUrl}
                    download
                    className="button secondary proof-download"
                  >
                    <Download size={16} /> Unduh bukti
                  </a>
                </div>
              ) : (
                <div className="proof-image">
                  <img
                    alt="Bukti transaksi yang diunggah"
                    src={proofUrl}
                    onError={() => setBroken(true)}
                  />
                  <a
                    className="button secondary proof-download"
                    href={downloadUrl}
                    download
                  >
                    <Download size={16} /> Unduh bukti
                  </a>
                </div>
              )}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
