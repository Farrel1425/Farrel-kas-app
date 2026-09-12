"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Eye,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import type { Category, Project, Transaction } from "@/lib/types";
import { Brand, Modal } from "./ui";
import { FinancialSummary, Ledger, TransactionDetail } from "./ledger";
import { dateLabel, statusLabel } from "@/lib/format";
export function PublicReport({
  project,
  categories,
  transactions,
  token,
  preview = false,
}: {
  project: Project;
  categories: Category[];
  transactions: Transaction[];
  token: string;
  preview?: boolean;
}) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const router = useRouter();
  // Fetch fresh data when focused and once per minute; no cached public snapshot.
  useEffect(() => {
    if (preview) return;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [preview, router]);
  const current = selected
    ? transactions.find((t) => t.id === selected.id)
    : undefined;
  return (
    <div className="public-page">
      <header className="public-header">
        <Brand />
        <span className="badge neutral">
          <Eye size={15} /> Hanya lihat
        </span>
      </header>
      {preview && (
        <div className="preview-banner">
          <span>Pratinjau laporan · data contoh</span>
          <Link href="/preview">
            Kembali ke dashboard <ArrowLeft size={15} />
          </Link>
        </div>
      )}
      <main className="public-content">
        <div className="public-intro">
          <span className="eyebrow">LAPORAN KEUANGAN PUBLIK</span>
          <span className={`badge ${project.status}`}>
            <span className="dot" />
            {statusLabel[project.status]}
          </span>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
          <span className="project-period">
            <CalendarDays size={15} />
            {dateLabel(project.start_date)} – {dateLabel(project.end_date)}
          </span>
        </div>
        <FinancialSummary transactions={transactions} />
        <section className="panel public-ledger">
          <div className="panel-title">
            <div>
              <h2>
                Riwayat transaksi{" "}
                <span className="count-pill">{transactions.length}</span>
              </h2>
              <p>Setiap catatan, terbuka untuk Anda.</p>
            </div>
            <button
              className="icon-button"
              onClick={() => router.refresh()}
              title="Muat ulang laporan"
              aria-label="Muat ulang laporan"
            >
              <RefreshCw size={17} />
            </button>
          </div>
          <Ledger
            transactions={transactions}
            categories={categories}
            onSelect={setSelected}
          />
        </section>
        <div className="public-disclaimer">
          <ShieldCheck size={21} />
          <div>
            <strong>Transparansi untuk setiap kegiatan.</strong>
            <p>
              Ini adalah laporan publik. Data hanya dapat dilihat dan tidak
              dapat diubah.
            </p>
          </div>
        </div>
      </main>
      <footer className="public-footer">
        Dikelola dengan <strong>FARREL KAS</strong>
        <span>Setiap rupiah, tercatat.</span>
      </footer>
      {current && (
        <Modal title="Detail transaksi" onClose={() => setSelected(null)}>
          <TransactionDetail
            transaction={current}
            category={categories.find((c) => c.id === current.category_id)}
            token={token}
            preview={preview}
          />
        </Modal>
      )}
    </div>
  );
}
