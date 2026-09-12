import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://farrel.store"),
  title: {
    default: "FARREL KAS — Aplikasi Keuangan yang Transparan",
    template: "%s | FARREL KAS",
  },
  description: "Kelola pemasukan dan pengeluaran dengan mudah, rapi, dan transparan.",
  applicationName: "FARREL KAS",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "/",
    siteName: "FARREL KAS",
    title: "FARREL KAS — Aplikasi Keuangan yang Transparan",
    description: "Kelola pemasukan dan pengeluaran dengan mudah, rapi, dan transparan.",
    images: [
      {
        url: "/farrel-kas-social.png",
        width: 1200,
        height: 630,
        alt: "FARREL KAS — Aplikasi Keuangan yang Transparan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FARREL KAS — Aplikasi Keuangan yang Transparan",
    description: "Kelola pemasukan dan pengeluaran dengan mudah, rapi, dan transparan.",
    images: ["/farrel-kas-social.png"],
  },
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
