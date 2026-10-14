# Panduan Life & Finance Dashboard

## A. Persiapan (sekali saja)
Pasang **Node.js LTS** (nodejs.org) dan **Git**. Buat akun gratis di **supabase.com**, **github.com**, dan **cloudflare.com**.

## B. Supabase
1. New project → pilih region terdekat (Singapore) → simpan password database.
2. Buka **SQL Editor → New query**, tempel seluruh isi `supabase/migrations/0001_init.sql`, klik **Run**. Harus muncul "Success".
3. **Project Settings → API**: salin **Project URL** dan **anon public key** (BUKAN service_role).
4. **Authentication → Providers → Email**: untuk pemakaian pribadi paling mudah matikan "Confirm email".

## C. Jalankan di laptop
```
npm install
copy .env.example .env      (Mac/Linux: cp .env.example .env)
```
Isi `.env` dengan URL dan anon key tadi, lalu `npm run dev` dan buka http://localhost:5173.
Klik **Daftar**, buat akun, lalu masuk.

Setelah akun Anda dibuat: **Authentication → Sign In / Providers → matikan "Allow new users to sign up"**.

## D. Langkah pertama di aplikasi
1. **Akun**: buat akun (BCA, Dompet, GoPay) dengan saldo awal. Tandai akun dana darurat.
2. **Transaksi**: catat pemasukan/pengeluaran (tombol + di HP).
3. **Anggaran**: set batas per kategori. **Pengaturan → Kategori**: tandai kategori kebutuhan pokok sebagai "Esensial".
4. **Aset & utang**, **Tujuan**, lalu coba **Tasks**, **Habits**.

## E. Deploy ke Cloudflare Pages
1. Buat repo GitHub dan upload proyek (`.env` tidak ikut karena ada di `.gitignore`).
2. Cloudflare → Workers & Pages → Create → Pages → Connect to Git → pilih repo.
3. Build command `npm run build`, output directory `dist`.
4. Environment variables: `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Di Supabase → Authentication → URL Configuration, isi **Site URL** dengan alamat `*.pages.dev` Anda.
6. Di HP: buka alamat itu di Chrome → menu → **Tambahkan ke layar utama** (PWA).

## F. Pengujian
- `npm test`: menguji rumus saldo, transfer, arus kas, utang, kekayaan bersih.
- Uji manual: (1) transfer tidak mengubah pemasukan/pengeluaran; (2) edit/hapus transaksi mengubah saldo dengan benar; (3) progres tujuan tidak mengubah saldo; (4) buat akun kedua di jendela incognito dan pastikan data akun pertama tidak terlihat (RLS).

## G. Batasan paket gratis (cek halaman pricing resmi, bisa berubah)
- Supabase Free: proyek bisa **di-pause jika lama tidak aktif** (buka aplikasi minimal seminggu sekali), kuota database/bandwidth terbatas, **tanpa jaminan backup**. Unduh **Pengaturan → Cadangan JSON** rutin.
- Cloudflare Pages Free: cukup untuk situs statis ini; ada batas jumlah build per bulan.
- Aplikasi memuat semua data Anda saat dibuka (dalam batch 1000 baris). Untuk puluhan ribu transaksi perlu optimasi lanjutan.
- PWA: tampilan dasar terbuka offline, tetapi data butuh internet.

## H. Struktur
- `supabase/migrations/0001_init.sql` skema, constraint, RLS, kategori default
- `src/lib/calc.ts` semua rumus keuangan · `src/lib/data.tsx` akses data
- `src/pages/` halaman · `src/components/` komponen · `src/styles/tokens.css` warna & ukuran
