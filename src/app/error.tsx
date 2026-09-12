"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="center-page">
      <h1>Data belum dapat dimuat.</h1>
      <p>
        Periksa koneksi Anda. Jika baru menyiapkan aplikasi, pastikan database
        Supabase sudah dipasang.
      </p>
      <button className="button primary" onClick={reset}>
        Coba lagi
      </button>
    </div>
  );
}
