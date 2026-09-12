"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Plus,
  Wallet,
  CalendarDays,
  ChevronRight,
  LogOut,
  ReceiptText,
  Tags,
  Share2,
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Check,
  X,
  ShieldCheck,
  Link2,
  Eye,
  LockKeyhole,
} from "lucide-react";
import type {
  ActionResult,
  Category,
  Profile,
  Project,
  Transaction,
  Workspace,
} from "@/lib/types";
import { dateLabel, rupiah, statusLabel, totals } from "@/lib/format";
import {
  createShare,
  deleteCategory,
  deleteTransaction,
  logout,
  setAdminActive,
  setAssignment,
  setProjectStatus,
  updateShare,
} from "@/app/actions";
import { Brand, CopyButton, Empty, Field, Form, Modal } from "./ui";
import { AdminForm, CategoryForm, ProjectForm, TransactionForm } from "./forms";
import { Ledger, TransactionDetail } from "./ledger";

type Popup =
  | { kind: "project"; project?: Project }
  | { kind: "category"; category?: Category }
  | { kind: "admin"; admin?: Profile }
  | {
      kind: "transaction";
      transaction?: Transaction;
      type?: "income" | "expense";
    }
  | { kind: "detail"; transaction: Transaction }
  | {
      kind: "confirm";
      title: string;
      description: string;
      action: (form: FormData) => Promise<ActionResult>;
      values: Record<string, string>;
    }
  | { kind: "assign" }
  | null;
export function Workbench({
  data,
  section = "dashboard",
  projectId,
  view = "overview",
  preview = false,
}: {
  data: Workspace;
  section?: string;
  projectId?: string;
  view?: string;
  preview?: boolean;
}) {
  const router = useRouter();
  const [popup, setPopup] = useState<Popup>(null),
    [toast, setToast] = useState(""),
    [filter, setFilter] = useState("all"),
    [projectSearch, setProjectSearch] = useState("");
  const master = data.profile.role === "master_admin",
    project = data.projects.find((p) => p.id === projectId),
    archived = project?.status === "archived";
  const transactions = project
    ? data.transactions.filter((t) => t.project_id === project.id)
    : data.transactions.filter((t) =>
        data.projects.some(
          (p) => p.id === t.project_id && p.status !== "archived",
        ),
      );
  const categories = project
    ? data.categories.filter((c) => c.project_id === project.id)
    : data.categories;
  const visibleProjects = data.projects.filter(
    (p) =>
      (filter === "all" ? p.status !== "archived" : p.status === filter) &&
      p.name.toLowerCase().includes(projectSearch.toLowerCase()),
  );
  const sum = totals(transactions),
    admins = data.profiles.filter((p) => p.role === "admin"),
    links = data.links.filter((l) => l.project_id === projectId);
  function href(path: string) {
    return preview ? `/preview?path=${encodeURIComponent(path)}` : path;
  }
  function done() {
    setPopup(null);
    setToast("Perubahan berhasil disimpan.");
    router.refresh();
    setTimeout(() => setToast(""), 4000);
  }
  function confirm(
    title: string,
    description: string,
    action: (form: FormData) => Promise<ActionResult>,
    values: Record<string, string>,
  ) {
    setPopup({ kind: "confirm", title, description, action, values });
  }
  const tabs = [
    { id: "overview", label: "Ringkasan", icon: LayoutDashboard },
    { id: "transactions", label: "Transaksi", icon: ReceiptText },
    { id: "categories", label: "Kategori / Sie", icon: Tags },
    { id: "share", label: "Bagikan laporan", icon: Share2 },
  ];
  const nav = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      id: "dashboard",
    },
    {
      label: master ? "Semua proyek" : "Proyek saya",
      href: "/projects",
      icon: FolderKanban,
      id: "projects",
    },
    ...(master
      ? [{ label: "Kelola Admin", href: "/admins", icon: Users, id: "admins" }]
      : []),
  ];
  function projectCard(p: Project) {
    const amounts = totals(
        data.transactions.filter((t) => t.project_id === p.id),
      ),
      assigned = data.assignments.filter((a) => a.project_id === p.id);
    return (
      <Link
        className="project-card"
        href={href(`/projects/${p.id}`)}
        key={p.id}
      >
        <div className="project-card-top">
          <span className="project-symbol">
            <FolderKanban size={23} />
          </span>
          <span className={`badge ${p.status}`}>
            <i className="dot" />
            {statusLabel[p.status]}
          </span>
        </div>
        <h3>{p.name}</h3>
        <p className="project-period">
          <CalendarDays size={13} />
          {dateLabel(p.start_date)} – {dateLabel(p.end_date)}
        </p>
        <div className="project-card-balance">
          <span>Saldo kas</span>
          <strong className={amounts.balance < 0n ? "expense" : ""}>
            {rupiah(amounts.balance)}
          </strong>
        </div>
        <div className="project-card-totals">
          <span>
            <ArrowDownLeft size={14} />
            {rupiah(amounts.income)}
          </span>
          <span>
            <ArrowUpRight size={14} />
            {rupiah(amounts.expense)}
          </span>
        </div>
        <div className="project-card-footer">
          <span className="assigned">
            <span className="avatar-stack">
              {assigned.slice(0, 2).map((a, i) => (
                <span key={a.admin_id}>
                  {data.profiles
                    .find((u) => u.id === a.admin_id)
                    ?.full_name.slice(0, 1) ?? <Users size={12} />}
                  <span className="sr-only">Admin {i + 1}</span>
                </span>
              ))}
            </span>
            {assigned.length
              ? `${assigned.length} Admin ditugaskan`
              : "Belum ada Admin"}
          </span>
          <span className="project-open">
            Buka proyek <ArrowUpRight size={15} />
          </span>
        </div>
      </Link>
    );
  }
  function categorySummary() {
    return (
      <section className="panel category-summary">
        <div className="panel-title">
          <h2>Ringkasan per Sie</h2>
          <Tags size={18} />
        </div>
        {categories.length ? (
          categories.map((c) => {
            const rows = transactions.filter((t) => t.category_id === c.id),
              s = totals(rows);
            return (
              <div className="category-summary-row" key={c.id}>
                <div>
                  <span className="category-dot" />
                  <strong>{c.name}</strong>
                  <small>{rows.length} transaksi</small>
                </div>
                <div>
                  <span className="income">+{rupiah(s.income)}</span>
                  <span className="expense">−{rupiah(s.expense)}</span>
                </div>
              </div>
            );
          })
        ) : (
          <Empty
            title="Belum ada kategori"
            description="Buat kategori untuk mengelompokkan transaksi."
          />
        )}
      </section>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href={href("/dashboard")} className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-label">RUANG KERJA</div>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.id}
              href={href(n.href)}
              className={`nav-item ${section === n.id ? "active" : ""}`}
            >
              <n.icon size={20} />
              {n.label}
              {n.id === "projects" && (
                <span className="nav-count">
                  {data.projects.filter((p) => p.status !== "archived").length}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <ShieldCheck size={22} />
          </span>
          <strong>Kas rapi, kegiatan lancar.</strong>
          <p>Satu tempat untuk setiap catatan keuangan proyek Anda.</p>
          <span>
            FARREL KAS <span>V1.0</span>
          </span>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{data.profile.full_name.slice(0, 1)}</span>
          <span>
            <strong>{data.profile.full_name}</strong>
            <small>{master ? "Master Admin" : "Admin"}</small>
          </span>
          {!preview && (
            <form action={logout}>
              <button
                className="icon-button"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut size={17} />
              </button>
            </form>
          )}
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="desktop-breadcrumb">
            Ruang kerja <ChevronRight size={14} />
            <strong>
              {project
                ? project.name
                : section === "admins"
                  ? "Kelola Admin"
                  : section === "projects"
                    ? "Proyek"
                    : "Dashboard"}
            </strong>
          </div>
          <Link className="mobile-brand" href={href("/dashboard")}>
            <Brand />
          </Link>
          <div className="topbar-right">
            <span className="role-label">
              <ShieldCheck size={14} />
              {master ? "Master Admin" : "Admin"}
            </span>
            <span className="avatar small">
              {data.profile.full_name.slice(0, 1)}
            </span>
            {!preview && (
              <form className="mobile-logout" action={logout}>
                <button className="icon-button" aria-label="Keluar">
                  <LogOut size={17} />
                </button>
              </form>
            )}
          </div>
        </header>
        {preview && (
          <div className="preview-banner">
            <Eye size={15} />
            <span>
              Pratinjau tampilan · data contoh, perubahan tidak disimpan.
            </span>
            <Link href="/login">
              Ke halaman masuk <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <main className="content">
          <div className="page-heading">
            <div>
              {project ? (
                <Link className="back-link" href={href("/projects")}>
                  ← Semua proyek
                </Link>
              ) : (
                <p className="eyebrow">
                  {section === "dashboard"
                    ? "CATAT DENGAN MUDAH. KELOLA DENGAN TENANG."
                    : "RUANG KERJA FARREL KAS"}
                </p>
              )}
              <h1>
                {project
                  ? project.name
                  : section === "admins"
                    ? "Kelola Admin"
                    : section === "projects"
                      ? master
                        ? "Semua proyek"
                        : "Proyek saya"
                      : `Halo, ${data.profile.full_name.split(" ")[0]}.`}{" "}
                {section === "dashboard" && !project && (
                  <span className="hello-dot" />
                )}
              </h1>
              <p>
                {project
                  ? project.description
                  : section === "admins"
                    ? "Atur akun dan akses tim pengelola keuangan Anda."
                    : section === "projects"
                      ? "Setiap kegiatan punya buku kasnya sendiri."
                      : "Ini ringkasan keuangan kegiatan Anda hari ini."}
              </p>
            </div>
            {!project && master && (
              <button
                className="button primary"
                onClick={() =>
                  setPopup({ kind: section === "admins" ? "admin" : "project" })
                }
              >
                <Plus size={18} />
                {section === "admins" ? "Tambah Admin" : "Buat proyek"}
              </button>
            )}
            {project && (
              <span className={`badge ${project.status}`}>
                <i className="dot" />
                {statusLabel[project.status]}
              </span>
            )}
          </div>

          {project && (
            <>
              <div className="project-meta">
                <span>
                  <CalendarDays size={15} />
                  {dateLabel(project.start_date)} –{" "}
                  {dateLabel(project.end_date)}
                </span>
                <span>
                  <Users size={15} />
                  {
                    data.assignments.filter((a) => a.project_id === project.id)
                      .length
                  }{" "}
                  Admin ditugaskan
                </span>
                {master && !archived && (
                  <button
                    className="text-button"
                    onClick={() => setPopup({ kind: "project", project })}
                  >
                    <Pencil size={14} /> Edit proyek
                  </button>
                )}
              </div>
              {archived && (
                <div className="notice archive-notice">
                  <LockKeyhole size={20} />
                  <span>
                    Proyek diarsipkan. Data tetap dapat dilihat; perubahan
                    dikunci.
                  </span>
                  {master && (
                    <button
                      className="text-button"
                      onClick={() =>
                        confirm(
                          "Buka kembali proyek?",
                          "Proyek akan kembali aktif dan dapat diedit oleh Admin yang ditugaskan.",
                          setProjectStatus,
                          { id: project.id, status: "active" },
                        )
                      }
                    >
                      <RotateCcw size={16} /> Buka kembali
                    </button>
                  )}
                </div>
              )}
              <div className="project-tabs">
                {tabs.map((t) => (
                  <Link
                    className={view === t.id ? "active" : ""}
                    href={href(
                      `/projects/${project.id}${t.id === "overview" ? "" : `/${t.id}`}`,
                    )}
                    key={t.id}
                  >
                    <t.icon size={17} />
                    {t.label}
                  </Link>
                ))}
              </div>
            </>
          )}

          {(section === "dashboard" || (project && view === "overview")) && (
            <>
              <div className="overview-grid">
                <section className="balance-card">
                  <div className="balance-card-label">
                    <Wallet size={18} />
                    {project ? "SALDO KAS PROYEK" : "TOTAL KAS KESELURUHAN"}
                    <span>{project ? "Buku kas" : "Lintas proyek"}</span>
                  </div>
                  <div className="balance-number">{rupiah(sum.balance)}</div>
                  <p>
                    {sum.balance < 0n
                      ? "Saldo minus · pengeluaran melebihi pemasukan"
                      : project
                        ? "Setiap pemasukan dan pengeluaran tercatat di sini."
                        : "Gabungan kas proyek aktif dan selesai, di luar arsip."}
                  </p>
                  <div className="balance-bottom">
                    <div>
                      <span>
                        <ArrowDownLeft size={16} /> Total pemasukan
                      </span>
                      <strong>{rupiah(sum.income)}</strong>
                    </div>
                    <div>
                      <span>
                        <ArrowUpRight size={16} /> Total pengeluaran
                      </span>
                      <strong>{rupiah(sum.expense)}</strong>
                    </div>
                  </div>
                  <div className="balance-art" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                </section>
                <section className="stats-card">
                  {project ? (
                    <>
                      <div className="stat-row">
                        <span className="stat-icon lavender">
                          <ReceiptText size={22} />
                        </span>
                        <div>
                          <span>Total transaksi</span>
                          <strong>
                            {transactions.length}
                            <small>catatan</small>
                          </strong>
                        </div>
                      </div>
                      <div className="stat-row">
                        <span className="stat-icon mint">
                          <Tags size={22} />
                        </span>
                        <div>
                          <span>Kategori / Sie</span>
                          <strong>
                            {categories.length}
                            <small>kategori</small>
                          </strong>
                        </div>
                      </div>
                      <div className="stat-foot">
                        <span className="dot" />
                        Buku kas {statusLabel[project.status].toLowerCase()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-row">
                        <span className="stat-icon lavender">
                          <FolderKanban size={22} />
                        </span>
                        <div>
                          <span>Total proyek</span>
                          <strong>
                            {
                              data.projects.filter(
                                (p) => p.status !== "archived",
                              ).length
                            }
                            <small>proyek</small>
                          </strong>
                        </div>
                        <span className="stat-tag">
                          {
                            data.projects.filter((p) => p.status === "active")
                              .length
                          }{" "}
                          aktif
                        </span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-icon mint">
                          {master ? (
                            <Users size={22} />
                          ) : (
                            <ReceiptText size={22} />
                          )}
                        </span>
                        <div>
                          <span>
                            {master ? "Admin aktif" : "Total transaksi"}
                          </span>
                          <strong>
                            {master
                              ? admins.filter((a) => a.is_active).length
                              : transactions.length}
                            <small>{master ? "orang" : "catatan"}</small>
                          </strong>
                        </div>
                      </div>
                      <div className="stat-foot">
                        <span className="dot" />
                        {
                          data.projects.filter((p) => p.status === "completed")
                            .length
                        }{" "}
                        proyek selesai
                      </div>
                    </>
                  )}
                </section>
              </div>
              {project && !archived && (
                <div className="transaction-shortcuts">
                  <button
                    className="button income-button"
                    onClick={() =>
                      setPopup({ kind: "transaction", type: "income" })
                    }
                  >
                    <Plus size={18} /> Catat pemasukan
                  </button>
                  <button
                    className="button expense-button"
                    onClick={() =>
                      setPopup({ kind: "transaction", type: "expense" })
                    }
                  >
                    <Plus size={18} /> Catat pengeluaran
                  </button>
                </div>
              )}
            </>
          )}

          {!project && (section === "dashboard" || section === "projects") && (
            <section className="projects-section">
              <div className="section-heading">
                <div>
                  <h2>
                    {section === "dashboard" ? "Proyek Anda" : "Daftar proyek"}
                    <span className="count-pill">{visibleProjects.length}</span>
                  </h2>
                  {section === "dashboard" && (
                    <p>Pantau kas setiap kegiatan dalam satu pandangan.</p>
                  )}
                </div>
                {section === "dashboard" && (
                  <Link className="text-button" href={href("/projects")}>
                    Lihat semua <ArrowRight size={16} />
                  </Link>
                )}
              </div>
              <div className="project-filters">
                <div className="filter-chips">
                  {[
                    ["all", "Semua"],
                    ["active", "Aktif"],
                    ["completed", "Selesai"],
                    ["archived", "Arsip"],
                  ].map(([v, l]) => (
                    <button
                      className={filter === v ? "active" : ""}
                      key={v}
                      onClick={() => setFilter(v)}
                    >
                      {l}
                      {v === "active" && (
                        <span>
                          {
                            data.projects.filter((p) => p.status === "active")
                              .length
                          }
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {section === "projects" && (
                  <input
                    className="project-search"
                    aria-label="Cari proyek"
                    placeholder="Cari nama proyek…"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                  />
                )}
              </div>
              {visibleProjects.length ? (
                <div className="project-grid">
                  {(section === "dashboard"
                    ? visibleProjects.slice(0, 3)
                    : visibleProjects
                  ).map(projectCard)}
                </div>
              ) : (
                <section className="panel">
                  <Empty
                    title="Belum ada proyek"
                    description={
                      master
                        ? "Buat proyek pertama untuk mulai mencatat keuangan kegiatan Anda."
                        : "Proyek yang ditugaskan Master Admin akan tampil di sini."
                    }
                  />
                </section>
              )}
            </section>
          )}

          {(section === "dashboard" ||
            (project && ["overview", "transactions"].includes(view))) && (
            <div
              className={project && view === "overview" ? "ledger-split" : ""}
            >
              <section className="panel transaction-panel">
                <div className="panel-title">
                  <div>
                    <h2>
                      {view === "transactions"
                        ? "Riwayat transaksi"
                        : "Transaksi terbaru"}
                    </h2>
                    <p>
                      {view === "transactions"
                        ? "Semua pemasukan dan pengeluaran proyek."
                        : "Catatan terakhir, tersusun dengan rapi."}
                    </p>
                  </div>
                  {project ? (
                    view === "transactions" ? (
                      !archived && (
                        <button
                          className="button primary"
                          onClick={() => setPopup({ kind: "transaction" })}
                        >
                          <Plus size={17} />
                          <span>Catat transaksi</span>
                        </button>
                      )
                    ) : (
                      <Link
                        className="text-button"
                        href={href(`/projects/${project.id}/transactions`)}
                      >
                        Lihat semua <ArrowRight size={15} />
                      </Link>
                    )
                  ) : (
                    <span className="badge neutral">
                      {transactions.length} catatan
                    </span>
                  )}
                </div>
                <Ledger
                  transactions={transactions}
                  categories={categories}
                  compact={view !== "transactions"}
                  onSelect={(t) => setPopup({ kind: "detail", transaction: t })}
                />
              </section>
              {project && view === "overview" && categorySummary()}
            </div>
          )}

          {project && view === "categories" && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <h2>Kategori / Sie</h2>
                  <p>
                    Kelompokkan pemasukan dan pengeluaran sesuai kebutuhan
                    proyek.
                  </p>
                </div>
                {!archived && (
                  <button
                    className="button primary"
                    onClick={() => setPopup({ kind: "category" })}
                  >
                    <Plus size={17} /> Tambah kategori
                  </button>
                )}
              </div>
              {categories.length ? (
                <div className="category-list">
                  {categories.map((c) => {
                    const used = transactions.filter(
                      (t) => t.category_id === c.id,
                    ).length;
                    return (
                      <div className="category-item" key={c.id}>
                        <span className="stat-icon lavender">
                          <Tags size={19} />
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>
                            {used} transaksi{" "}
                            {used > 0 && "· Tidak dapat dihapus"}
                          </small>
                        </div>
                        {!archived && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${c.name}`}
                              onClick={() =>
                                setPopup({ kind: "category", category: c })
                              }
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-button danger-text"
                              disabled={used > 0}
                              title={
                                used
                                  ? "Kategori masih digunakan"
                                  : "Hapus kategori"
                              }
                              aria-label={`Hapus ${c.name}`}
                              onClick={() =>
                                confirm(
                                  "Hapus kategori?",
                                  `Kategori “${c.name}” akan dihapus.`,
                                  deleteCategory,
                                  { id: c.id, project_id: project.id },
                                )
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  title="Buat kategori pertama"
                  description="Contoh: Pengurus, Sie Konsumsi, atau Sie Transportasi."
                />
              )}
            </section>
          )}

          {project && view === "share" && (
            <div className="share-layout">
              <section>
                <div className="notice">
                  <Eye size={21} />
                  <span>
                    Siapa pun yang memiliki tautan dapat membaca laporan terbaru
                    tanpa login. Anda menentukan apakah bukti transaksi ikut
                    ditampilkan.
                  </span>
                </div>
                {links.length ? (
                  links.map((link) => (
                    <section className="panel share-card" key={link.id}>
                      <div className="panel-title">
                        <span className="stat-icon mint">
                          <Link2 size={22} />
                        </span>
                        <h2>Tautan laporan publik</h2>
                        <span
                          className={`badge ${link.is_active ? "active" : "archived"}`}
                        >
                          {link.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <Form
                        action={updateShare}
                        disabled={archived}
                        onSuccess={done}
                        preview={preview}
                      >
                        <input type="hidden" name="id" value={link.id} />
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <Field label="Tautan publik">
                          <input
                            readOnly
                            aria-label="Tautan publik"
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${link.token}`}
                          />
                        </Field>
                        <div className="button-row">
                          <CopyButton
                            text={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${link.token}`}
                          />
                          <Link
                            className="button secondary"
                            href={`/share/${link.token}`}
                            target="_blank"
                          >
                            Buka laporan <ArrowUpRight size={16} />
                          </Link>
                        </div>
                        <label className="toggle-row">
                          <span>
                            <strong>Tampilkan bukti transaksi</strong>
                            <small>
                              Foto dan dokumen dapat dibuka oleh pemegang
                              tautan.
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            name="show_proof"
                            defaultChecked={link.show_proof}
                            disabled={archived}
                          />
                        </label>
                        <label className="toggle-row">
                          <span>
                            <strong>Tautan aktif</strong>
                            <small>
                              Matikan untuk menutup akses publik melalui tautan
                              ini.
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked={link.is_active}
                            disabled={archived}
                          />
                        </label>
                        {archived && (
                          <p className="muted">
                            Buka kembali proyek untuk mengubah pengaturan
                            tautan.
                          </p>
                        )}
                      </Form>
                    </section>
                  ))
                ) : (
                  <section className="panel">
                    <Empty
                      title="Bagikan cerita di balik angka"
                      description="Buat tautan untuk memberi panitia dan pendukung akses ke laporan keuangan."
                    />
                    {!archived && (
                      <Form
                        action={createShare}
                        preview={preview}
                        onSuccess={done}
                        label="Buat tautan publik"
                      >
                        <input
                          type="hidden"
                          name="project_id"
                          value={project.id}
                        />
                        <label className="checkbox">
                          <input type="checkbox" name="show_proof" /> Tampilkan
                          bukti transaksi
                        </label>
                      </Form>
                    )}
                    {preview && (
                      <Link
                        href="/preview/public"
                        className="button secondary full"
                      >
                        Lihat contoh laporan publik <ArrowUpRight size={17} />
                      </Link>
                    )}
                  </section>
                )}
                {links.length > 0 && !archived && (
                  <Form
                    action={createShare}
                    preview={preview}
                    onSuccess={done}
                    label="Buat tautan tambahan"
                  >
                    <input type="hidden" name="project_id" value={project.id} />
                  </Form>
                )}
              </section>
              <aside className="panel share-guide">
                <span className="stat-icon lavender">
                  <ShieldCheck size={24} />
                </span>
                <h2>Transparan, tetap terkendali.</h2>
                <p>Laporan hanya menampilkan data dari proyek ini.</p>
                <ul>
                  <li>
                    <Check size={16} /> Tanpa akun untuk pembaca
                  </li>
                  <li>
                    <Check size={16} /> Tidak ada akses edit atau hapus
                  </li>
                  <li>
                    <Check size={16} /> Data terbaru saat laporan dibuka
                  </li>
                  <li>
                    <Check size={16} /> Tautan bisa dinonaktifkan
                  </li>
                </ul>
              </aside>
            </div>
          )}

          {project && master && view === "overview" && (
            <section className="panel project-management">
              <div>
                <h2>Pengelolaan proyek</h2>
                <p>Atur penugasan Admin dan status kegiatan.</p>
              </div>
              <div className="button-row">
                {!archived && (
                  <>
                    <button
                      className="button secondary"
                      onClick={() => setPopup({ kind: "assign" })}
                    >
                      <Users size={16} /> Atur Admin
                    </button>
                    <button
                      className="button secondary"
                      onClick={() =>
                        confirm(
                          project.status === "completed"
                            ? "Aktifkan proyek?"
                            : "Tandai proyek selesai?",
                          "Proyek selesai tetap dapat menerima perbaikan transaksi.",
                          setProjectStatus,
                          {
                            id: project.id,
                            status:
                              project.status === "completed"
                                ? "active"
                                : "completed",
                          },
                        )
                      }
                    >
                      <Check size={16} />
                      {project.status === "completed"
                        ? "Aktifkan"
                        : "Tandai selesai"}
                    </button>
                    <button
                      className="button secondary danger-text"
                      onClick={() =>
                        confirm(
                          "Arsipkan proyek?",
                          "Proyek disembunyikan dari daftar utama. Semua perubahan dikunci sampai Master Admin membukanya kembali. Tautan publik yang aktif tetap dapat dibaca.",
                          setProjectStatus,
                          { id: project.id, status: "archived" },
                        )
                      }
                    >
                      <Archive size={16} /> Arsipkan
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {section === "admins" && (
            <section className="panel">
              <div className="panel-title">
                <h2>
                  Tim pengelola{" "}
                  <span className="count-pill">{admins.length}</span>
                </h2>
                <span className="muted">Akses sesuai penugasan proyek</span>
              </div>
              {admins.length ? (
                admins.map((admin) => (
                  <div className="admin-row" key={admin.id}>
                    <span className="avatar">
                      {admin.full_name.slice(0, 1)}
                    </span>
                    <div className="admin-identity">
                      <strong>{admin.full_name}</strong>
                      <small>{admin.email}</small>
                    </div>
                    <span
                      className={`badge ${admin.is_active ? "active" : "archived"}`}
                    >
                      {admin.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                    <span className="admin-project-count">
                      {
                        data.assignments.filter((a) => a.admin_id === admin.id)
                          .length
                      }{" "}
                      proyek
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${admin.full_name}`}
                      onClick={() => setPopup({ kind: "admin", admin })}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="button secondary compact-button"
                      onClick={() =>
                        confirm(
                          admin.is_active
                            ? "Nonaktifkan Admin?"
                            : "Aktifkan Admin?",
                          admin.is_active
                            ? `${admin.full_name} tidak dapat mengakses data setelah dinonaktifkan. Penugasan proyek tetap tersimpan.`
                            : `${admin.full_name} akan dapat mengakses proyek yang ditugaskan kembali.`,
                          setAdminActive,
                          {
                            id: admin.id,
                            is_active: admin.is_active ? "" : "on",
                          },
                        )
                      }
                    >
                      {admin.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </div>
                ))
              ) : (
                <Empty
                  title="Belum ada Admin"
                  description="Tambahkan Admin, lalu tugaskan ke proyek melalui halaman proyek."
                />
              )}
              <div className="panel-footnote">
                <ShieldCheck size={16} /> Master Admin dapat mengelola semua
                proyek. Admin hanya memiliki akses ke proyek yang ditugaskan.
              </div>
            </section>
          )}
          <footer className="app-footer">
            <span>© {new Date().getFullYear()} FARREL KAS</span>
            <span>Dibuat untuk kas yang lebih tertata.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        {nav.map((n) => (
          <Link
            key={n.id}
            className={section === n.id ? "active" : ""}
            href={href(n.href)}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
          <button aria-label="Tutup pemberitahuan" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {popup && (
        <Modal
          title={
            popup.kind === "confirm"
              ? popup.title
              : popup.kind === "project"
                ? popup.project
                  ? "Edit proyek"
                  : "Buat proyek baru"
                : popup.kind === "admin"
                  ? popup.admin
                    ? "Edit Admin"
                    : "Tambah Admin"
                  : popup.kind === "category"
                    ? popup.category
                      ? "Edit kategori"
                      : "Tambah kategori / Sie"
                    : popup.kind === "assign"
                      ? "Penugasan Admin"
                      : popup.kind === "detail"
                        ? "Detail transaksi"
                        : popup.transaction
                          ? "Edit transaksi"
                          : "Catat transaksi"
          }
          onClose={() => setPopup(null)}
        >
          {popup.kind === "project" && (
            <ProjectForm
              project={popup.project}
              onSuccess={done}
              preview={preview}
            />
          )}
          {popup.kind === "admin" && (
            <AdminForm admin={popup.admin} onSuccess={done} preview={preview} />
          )}
          {popup.kind === "category" && project && (
            <CategoryForm
              project={project}
              category={popup.category}
              onSuccess={done}
              preview={preview}
            />
          )}
          {popup.kind === "transaction" && (
            <TransactionForm
              project={
                project ??
                data.projects.find(
                  (p) => p.id === popup.transaction?.project_id,
                )!
              }
              categories={data.categories.filter(
                (c) =>
                  c.project_id ===
                  (project?.id ?? popup.transaction?.project_id),
              )}
              transaction={popup.transaction}
              type={popup.type}
              onSuccess={done}
              preview={preview}
            />
          )}
          {popup.kind === "detail" && (
            <TransactionDetail
              transaction={popup.transaction}
              category={data.categories.find(
                (c) => c.id === popup.transaction.category_id,
              )}
              preview={preview}
              onEdit={
                data.projects.find((p) => p.id === popup.transaction.project_id)
                  ?.status === "archived"
                  ? undefined
                  : () =>
                      setPopup({
                        kind: "transaction",
                        transaction: popup.transaction,
                      })
              }
              onDelete={
                data.projects.find((p) => p.id === popup.transaction.project_id)
                  ?.status === "archived"
                  ? undefined
                  : () =>
                      confirm(
                        "Hapus transaksi?",
                        "Transaksi akan dihapus dan saldo otomatis dihitung ulang. Tindakan ini tidak dapat dibatalkan.",
                        deleteTransaction,
                        {
                          id: popup.transaction.id,
                          project_id: popup.transaction.project_id,
                        },
                      )
              }
            />
          )}
          {popup.kind === "confirm" && (
            <Form
              action={popup.action}
              onSuccess={done}
              preview={preview}
              label="Ya, lanjutkan"
            >
              <p className="confirm-description">{popup.description}</p>
              {Object.entries(popup.values).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            </Form>
          )}
          {popup.kind === "assign" && project && (
            <div className="assign-list">
              {admins.length ? (
                admins.map((a) => {
                  const assigned = data.assignments.some(
                    (v) => v.admin_id === a.id && v.project_id === project.id,
                  );
                  return (
                    <Form
                      key={a.id}
                      action={setAssignment}
                      preview={preview}
                      onSuccess={done}
                      label={assigned ? "Hapus penugasan" : "Tugaskan Admin"}
                    >
                      <input
                        type="hidden"
                        name="project_id"
                        value={project.id}
                      />
                      <input type="hidden" name="admin_id" value={a.id} />
                      <input
                        type="hidden"
                        name="assigned"
                        value={assigned ? "" : "on"}
                      />
                      <div className="assign-person">
                        <span className="avatar">
                          {a.full_name.slice(0, 1)}
                        </span>
                        <span>
                          <strong>{a.full_name}</strong>
                          <small>
                            {a.is_active
                              ? assigned
                                ? "Sudah ditugaskan"
                                : "Belum ditugaskan"
                              : "Akun nonaktif"}
                          </small>
                        </span>
                      </div>
                    </Form>
                  );
                })
              ) : (
                <Empty
                  title="Belum ada Admin"
                  description="Buat akun Admin melalui menu Kelola Admin terlebih dahulu."
                />
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
