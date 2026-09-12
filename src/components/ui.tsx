"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Wallet, LoaderCircle, Check, Copy, FolderOpen } from "lucide-react";
import type { ActionResult } from "@/lib/types";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-icon">
        <Wallet size={22} />
      </span>
      <span>
        FARREL<span className="brand-kas"> KAS</span>
        <small>SETIAP RUPIAH, TERCATAT.</small>
      </span>
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X size={21} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function Form({
  action,
  children,
  onSuccess,
  label = "Simpan perubahan",
  preview = false,
  disabled = false,
}: {
  action: (form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  onSuccess?: () => void;
  label?: string;
  preview?: boolean;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || disabled) return;
        if (preview) {
          setError(
            "Ini pratinjau data contoh. Penyimpanan tersedia setelah Supabase disambungkan dan Anda login.",
          );
          return;
        }
        const data = new FormData(e.currentTarget);
        setPending(true);
        setError("");
        try {
          const result = await action(data);
          if (result.ok) onSuccess?.();
          else setError(result.message);
        } catch {
          setError("Koneksi terputus. Silakan coba lagi.");
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
      {error && (
        <div role="alert" className="notice notice-error">
          {error}
        </div>
      )}
      <button
        className="button primary full"
        disabled={pending || disabled}
        type="submit"
      >
        {pending ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Check size={18} />
        )}{" "}
        {pending ? "Menyimpan…" : label}
      </button>
    </form>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title = "Belum ada data",
  description = "Data akan tampil di sini setelah ditambahkan.",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FolderOpen size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <>
      <button
        className="button secondary"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setFailed(false);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            setFailed(true);
          }
        }}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
        {copied ? "Tersalin" : "Salin tautan"}
      </button>
      {failed && (
        <small role="alert">
          Silakan pilih dan salin teks tautan secara manual.
        </small>
      )}
    </>
  );
}
