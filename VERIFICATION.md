# Verifikasi lokal FARREL KAS

Tanggal: 12 September 2026.

## Hasil

- `npm run lint`: lolos, tanpa error atau warning.
- `npm run typecheck`: lolos.
- `npm test`: 6 kelompok pengujian lolos, 0 gagal. Kelompok database menjalankan sejumlah assertion pada PostgreSQL PGlite.
- `npm run build`: lolos (Next.js 16.3.5).
- Browser desktop 1440 × 1000 dan mobile 390 × 844: dashboard tampil, tidak ada overflow horizontal.
- Navigasi dashboard → proyek → transaksi berfungsi.
- Form pemasukan menampilkan nominal, kategori/Sie, tanggal, keterangan, dan bukti opsional; tanpa kolom sumber/penerima.
- Tombol nominal cepat dan pemilihan kategori berfungsi. Pratinjau menolak penyimpanan dengan pesan yang jelas.
- Filter pengeluaran + pencarian “Konsumsi” menghasilkan satu transaksi Rp1.500.000 sesuai data contoh.
- Detail transaksi menampilkan informasi dan keadaan bukti tidak tersedia tanpa broken image.
- Laporan publik mobile menampilkan nominal utuh dalam ringkasan dua kolom dengan saldo di bawah. Tidak ada navigasi Admin atau kontrol edit/hapus.
- Halaman `/dashboard` tanpa konfigurasi/sesi dialihkan ke `/login` melalui navigasi Next.js.
- Endpoint bukti tanpa akses mengembalikan 404 dan `Cache-Control: private, no-store`.
- Tidak ada error console browser yang terdeteksi selama pemeriksaan.

## Pengujian database

- Metadata signup tidak dapat menjadikan pengguna sebagai Master Admin.
- Admin hanya membaca proyek yang ditugaskan; penyisipan transaksi ke proyek lain ditolak.
- Foreign key gabungan menolak kategori dari proyek lain.
- Pengguna tidak dapat menaikkan role sendiri, memindahkan kategori antarproyek, atau memalsukan `created_by` melalui update.
- Kategori terpakai tidak dapat dihapus, tetapi namanya bisa diperbaiki.
- Admin dalam proyek yang sama bisa saling memperbaiki transaksi.
- Akses objek bukti terisolasi per proyek.
- Proyek selesai tetap dapat diedit.
- Proyek arsip mengunci transaksi untuk Master Admin maupun Admin; metadata proyek juga terkunci sampai dibuka kembali.
- Membuka kembali proyek mengizinkan perubahan lagi.
- Admin nonaktif tidak dapat membaca transaksi/proyek.
- Role anonymous tidak dapat membaca transaksi atau share token secara langsung.
- Saldo negatif dan agregasi rupiah yang melampaui safe integer JavaScript tetap tepat.
- Validasi menolak nominal nol/negatif/pecahan, tanggal tidak nyata, serta file yang kontennya tidak sesuai MIME.

## Batas verifikasi

Belum ada URL/kunci proyek Supabase atau konfigurasi deployment Vercel dari pengguna. Pengujian end-to-end dengan Supabase Auth, Storage, dan tautan publik asli belum dilakukan. Pengujian PGlite memakai schema Auth/Storage minimal untuk menguji SQL dan RLS, bukan mengemulasi seluruh layanan Supabase. Ikuti checklist integrasi di README setelah koneksi tersedia.
