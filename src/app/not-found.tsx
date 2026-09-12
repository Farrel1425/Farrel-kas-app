import Link from "next/link";
import { LockKeyhole } from "lucide-react";
export default function NotFound() {
  return (
    <div className="center-page">
      <LockKeyhole size={36} className="blue" />
      <h1>Halaman tidak tersedia.</h1>
      <p>
        Tautan mungkin sudah dinonaktifkan, tidak ditemukan, atau Anda tidak
        memiliki akses.
      </p>
      <Link href="/" className="button primary">
        Kembali ke awal
      </Link>
    </div>
  );
}
