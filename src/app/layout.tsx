import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "FARREL KAS — Setiap rupiah, tercatat.",
    template: "%s | FARREL KAS",
  },
  description:
    "Buku kas sederhana untuk setiap proyek dan kegiatan. Catat pemasukan, pengeluaran, dan bagikan laporan dengan mudah.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
