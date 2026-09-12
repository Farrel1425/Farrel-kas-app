# FARREL KAS

Buku kas per proyek/event dengan antarmuka Bahasa Indonesia. Next.js App Router, TypeScript strict, Tailwind CSS, Supabase Auth/PostgreSQL/Storage, siap dijalankan di Vercel.

## Status penyerahan

Kode aplikasi, migrasi database, RLS, penyimpanan bukti privat, dan pengujian lokal tersedia. **Belum tersambung ke proyek Supabase pengguna dan belum dipublikasikan ke Vercel.** Pengujian login/unggah/tautan publik terhadap layanan Supabase asli harus dijalankan setelah konfigurasi diisi. Pratinjau `/preview` memakai data contoh terpisah dan tidak menyimpan perubahan.

## Menjalankan aplikasi

Memerlukan Node.js 22 atau lebih baru.

```powershell
npm ci
Copy-Item .env.example .env.local
```

Isi `.env.local` dari proyek Supabase Anda:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=KUNCI_PUBLISHABLE_PROYEK
SUPABASE_SERVICE_ROLE_KEY=KUNCI_SERVICE_ROLE_SERVER
```

`SUPABASE_SERVICE_ROLE_KEY` hanya dipakai server. Jangan mengawali namanya dengan `NEXT_PUBLIC_`, jangan menyimpan ke Git, dan jangan memasukkannya ke kode browser. Semua mutasi proyek/transaksi/kategori memakai sesi pengguna dengan RLS; kunci layanan hanya untuk pengelolaan akun, pembacaan laporan publik yang sudah memvalidasi token, dan pembersihan bukti setelah penghapusan transaksi yang sudah diotorisasi.

Bukti dibatasi 4 MB per berkas agar unggah melalui server dan pembukaan bukti tetap berada di bawah [batas payload Vercel Functions](https://vercel.com/docs/functions/limitations). Validasi ukuran dilakukan di browser, server, dan bucket Storage.

1. Buat **proyek Supabase baru khusus FARREL KAS**.
2. Jalankan `supabase/migrations/001_farrel_kas.sql` melalui SQL Editor **sekali**. Migrasi membuat tabel, trigger profil, kebijakan RLS, serta bucket privat `transaction-proofs`. Jangan menjalankannya di database lain yang sudah memiliki tabel dengan nama yang sama.
3. Di pengaturan Auth, gunakan login email dan kata sandi, lalu nonaktifkan pendaftaran publik (_Allow new users to sign up_). Akun Admin dibuat melalui Master Admin.
4. Buat pengguna pertama dari Authentication → Users → Add user. Masukkan email dan kata sandi Anda sendiri, serta konfirmasi email melalui kontrol admin. Trigger otomatis membuat profil dengan role `admin`.
5. Promosikan pengguna tersebut melalui SQL Editor (ganti email dan nama):

```sql
update public.profiles
set role = 'master_admin', full_name = 'Nama Anda'
where email = 'email-anda@example.com';
```

6. Jalankan aplikasi:

```powershell
npm run dev
```

Buka `http://localhost:3000/login`. Master Admin dapat membuat proyek, menambahkan Admin, menugaskannya dari halaman proyek, lalu membuat kategori dan mencatat transaksi.

Tanpa konfigurasi Supabase, halaman masuk menjelaskan bahwa koneksi belum diatur dan menyediakan tautan ke `/preview`. Login dan penyimpanan nyata tidak dipalsukan. `/preview/public` menampilkan contoh laporan publik. Data contoh tidak pernah dimasukkan ke database.

## Deployment Vercel

1. Simpan folder **farrel-kas** sebagai repositori Git atau pilih folder ini sebagai Root Directory pada proyek Vercel.
2. Import proyek melalui Vercel, pilih framework **Next.js**, dan gunakan build `npm run build`.
3. Tambahkan tiga environment variable yang sama melalui pengaturan proyek Vercel. Jangan memasukkan `.env.local` ke repositori.
4. Deploy, lalu atur Site URL Supabase Auth ke domain HTTPS Vercel yang dihasilkan.
5. Login dengan Master Admin dan jalankan checklist integrasi berikut sebelum memasukkan catatan keuangan asli.

## Checklist integrasi layanan nyata

- Master Admin bisa login dan membuat dua proyek; Admin A hanya ditugaskan ke proyek A, Admin B ke proyek B.
- Admin A tidak dapat membuka proyek B dengan mengganti URL, ID transaksi, kategori, atau jalur bukti. Uji juga lewat REST dengan JWT pengguna.
- Dua Admin yang ditugaskan ke proyek A bisa saling mengedit transaksi.
- Kategori baru bisa dibuat/diubah; kategori yang digunakan transaksi tidak bisa dihapus.
- Pemasukan dan pengeluaran memperbarui saldo, termasuk ketika hasilnya negatif. Sumber/penerima tidak ada sebagai kolom terpisah.
- JPG/PNG/PDF di bawah 4 MB bisa diunggah. Konten tidak sesuai tipe, file lain, dan file melebihi 4 MB ditolak.
- Tautan publik bisa dibuka tanpa login dan hanya menampilkan proyek terkait. Pengaturan bukti benar-benar berlaku saat URL bukti dibuka langsung.
- Nonaktifkan tautan: halaman publik dan endpoint bukti harus berhenti memberikan data. Halaman yang sudah terbuka memuat ulang maksimal setiap 60 detik atau saat kembali mendapat fokus; data yang sebelumnya sudah dilihat tidak bisa ditarik kembali dari pembaca.
- Menonaktifkan Admin memblokir sesi yang sudah ada melalui pemeriksaan profil aktif dan RLS.
- Proyek selesai tetap bisa diedit. Proyek arsip tidak bisa diedit siapa pun; Master Admin dapat membuka kembali. Tautan publik yang masih aktif tetap dapat membaca proyek arsip; matikan sebelum mengarsipkan bila akses publik ingin ditutup.
- Edit profil Admin memperbarui nama/email; penggantian kata sandi opsional dilakukan oleh Master Admin. Akun Master Admin tidak dapat dinonaktifkan dari menu Admin.

## Perintah verifikasi

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` memakai PostgreSQL lokal melalui PGlite untuk mengeksekusi migrasi asli dan menguji RLS dengan role `authenticated`/`anon`. Schema `auth`/`storage` minimal dibuat hanya di lingkungan pengujian. Ini menguji SQL dan isolasi data, bukan menggantikan uji integrasi Supabase Auth atau Storage terkelola.

## Aturan V1

- Master Admin dan Admin login; Viewer tanpa login.
- Satu Admin dapat ditugaskan ke beberapa proyek, satu proyek dapat memiliki beberapa Admin.
- Lima isian transaksi: tanggal, nominal, kategori/Sie, keterangan, bukti opsional.
- Keterangan wajib diisi agar transaksi dapat dikenali; detail sumber/penerima bisa ditulis di sini.
- Nominal berupa rupiah utuh, positif, maksimal 14 digit per transaksi; database `numeric(16,2)` dengan constraint tanpa pecahan. Total dihitung memakai `BigInt` agar tetap presisi bahkan bila melampaui safe integer JavaScript.
- Dana awal dicatat sebagai pemasukan biasa; saldo tidak disimpan secara manual; tidak ada pemisahan kas tunai/rekening.
- Penghapusan transaksi memiliki konfirmasi. Tidak ada approval, audit kompleks, RAB, notifikasi, budgeting, payment gateway, ekspor kompleks, atau klaim verifikasi transaksi.

## Struktur

```text
src/app/                     Routing Next.js, server actions, dan endpoint bukti
src/components/workbench.tsx Kerangka dashboard, proyek, kategori, Admin, share
src/components/forms.tsx     Form proyek, transaksi, kategori, dan Admin
src/components/ledger.tsx    Daftar/filter/detail transaksi, ringkasan keuangan
src/components/ui.tsx        Modal, form, tombol salin, empty state, brand
src/components/public-report.tsx Laporan publik tanpa kontrol administrasi
src/lib/data.ts              Otorisasi server dan pembacaan data berpaginasi
src/lib/supabase/server.ts   Klien sesi dan klien layanan server-only
src/lib/validation.ts        Validasi input dan signature file
src/lib/format.ts            Format rupiah/tanggal dan agregasi presisi
supabase/migrations/        Tabel, relasi, RLS, trigger, bucket privat
tests/                      Pengujian database serta logika keuangan
```

Relasi kategori/transaksi memakai foreign key gabungan `(category_id, project_id)` untuk menolak kategori proyek lain bahkan jika akses UI dilewati. Identitas proyek dan metadata penciptaan tidak dapat diubah via role pengguna. Tautan menggunakan token acak kriptografis 256 bit. Tidak ada akses anonymous langsung ke tabel; laporan publik dan bukti selalu diperiksa di server, dan bukti disajikan dengan `Cache-Control: private, no-store`.

Data laporan diambil berpaginasi sehingga saldo tidak terpotong oleh batas default 1.000 baris Supabase. Untuk V1 data proyek yang boleh diakses dimuat ke workspace; volume sangat besar nantinya memerlukan pagination/filter server tanpa mengubah aturan bisnis.

Referensi implementasi: [Next.js App Router](https://nextjs.org/docs/app/getting-started), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
