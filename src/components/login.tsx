"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Wallet,
  Check,
  LoaderCircle,
} from "lucide-react";
import { login } from "@/app/actions";
import { Brand, Field } from "./ui";
export function Login({
  ready,
  inactive,
}: {
  ready: boolean;
  inactive: boolean;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(
      inactive ? "Akun Anda dinonaktifkan. Hubungi Master Admin." : "",
    );
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story-copy">
          <span className="login-eyebrow">BUKU KAS UNTUK SETIAP KEGIATAN</span>
          <h1>
            Kegiatan berarti.
            <br />
            Keuangan tertata.
          </h1>
          <p>
            Dari rupiah pertama hingga acara selesai.
            <br />
            Catat, kelola, dan bagikan dengan tenang.
          </p>
          <div className="login-illustration" aria-hidden="true">
            <span className="illustration-icon">
              <Wallet size={31} />
            </span>
            <div className="illustration-line wide" />
            <div className="illustration-line" />
            <div className="illustration-row">
              <span>
                <Check size={17} />
              </span>
              <i />
              <b />
            </div>
            <div className="illustration-row">
              <span>
                <Check size={17} />
              </span>
              <i />
              <b />
            </div>
            <div className="illustration-row">
              <span>
                <Check size={17} />
              </span>
              <i />
              <b />
            </div>
            <span className="illustration-stamp">
              <ShieldCheck size={18} /> Rapi & transparan
            </span>
          </div>
        </div>
        <p className="login-story-footer">SETIAP RUPIAH, TERCATAT.</p>
      </section>
      <main className="login-form-side">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <div className="login-card">
          <span className="login-small-icon">
            <Wallet size={25} />
          </span>
          <h2>Selamat datang kembali.</h2>
          <p>Masuk untuk mengelola buku kas kegiatan Anda.</p>
          {!ready && (
            <div className="notice setup-notice">
              <ShieldCheck size={21} />
              <span>
                <strong>Aplikasi siap disambungkan.</strong>
                <br />
                Koneksi Supabase belum diatur. Pratinjau tampilan tersedia di
                bawah.
              </span>
            </div>
          )}
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              setError("");
              try {
                const result = await login(new FormData(e.currentTarget));
                if (!result.ok) setError(result.message);
                else router.push("/dashboard");
              } catch (err) {
                if (
                  err instanceof Error &&
                  err.message.includes("NEXT_REDIRECT")
                )
                  router.push("/dashboard");
                else
                  setError(
                    "Tidak dapat masuk. Periksa koneksi lalu coba lagi.",
                  );
              } finally {
                setPending(false);
              }
            }}
          >
            <Field label="Email">
              <input
                name="email"
                type="email"
                placeholder="nama@email.com"
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Kata sandi">
              <span className="password-input">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={
                    show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </Field>
            {error && (
              <div role="alert" className="notice notice-error">
                {error}
              </div>
            )}
            <button
              className="button primary full"
              disabled={pending || !ready}
              type="submit"
            >
              {pending ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Masuk ke FARREL KAS <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <p className="login-help">
            Belum memiliki akun atau lupa kata sandi?
            <br />
            Hubungi Master Admin Anda.
          </p>
          {!ready && (
            <Link href="/preview" className="preview-link">
              Lihat pratinjau aplikasi <ArrowUpIcon />
            </Link>
          )}
          <div className="login-security">
            <ShieldCheck size={16} /> Akses khusus Master Admin dan Admin
          </div>
        </div>
        <footer>© {new Date().getFullYear()} FARREL KAS</footer>
      </main>
    </div>
  );
}
function ArrowUpIcon() {
  return <ArrowRight size={16} />;
}
