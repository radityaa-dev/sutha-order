# Sutha Corner - QR-Based Food Ordering System

Sistem pemesanan makanan berbasis QR Code untuk kantin dan warung makan, dibangun dengan Next.js, Supabase, dan Xendit.

## Fitur Utama
1. **Menu Pelanggan Berbasis QR (`/m/[token]`)**:
   - Akses otomatis via scan QR meja.
   - Pengelompokan kategori dan keranjang belanja (Zustand).
   - Validasi harga dan stok secara server-side melalui fungsi atomik PostgreSQL.
2. **Integrasi Xendit Payment Gateway**:
   - Pembuatan invoice otomatis.
   - Sinkronisasi status pembayaran (via webhook dan tombol polling/manual check).
3. **Panel Admin (`/admin`)**:
   - Manajemen Kategori, Menu, dan Meja (dengan generator QR Code siap unduh).
   - Manajemen Order *real-time* (Antrean dapur dengan *Supabase Realtime*).
   - Dasbor penjualan harian.

---

## 🛠️ Setup & Instalasi

### 1. Environment Variables (`.env.local`)
Buat file `.env.local` di root direktori dengan isi:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

XENDIT_SECRET_KEY=your_xendit_secret_key
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Migrations
Jalankan file SQL migrasi di Supabase SQL Editor secara berurutan:
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/003_create_order_function.sql`

### 3. Menjalankan Server Lokal
```bash
npm install
npm run dev
```

---

## 🚀 Deploy ke Vercel
1. Hubungkan repository GitHub Anda ke Vercel.
2. Tambahkan *Environment Variables* sesuai file `.env.local` di pengaturan Vercel.
3. Deploy!

---

## 📋 Checklist Demo End-to-End
1. Buka Admin `/admin/tables`, buat meja baru, dan unduh/scan QR Code.
2. Buka link menu pelanggan (`/m/[token]`).
3. Tambahkan beberapa menu ke keranjang dan lakukan *checkout*.
4. Klik **Bayar Sekarang** untuk diarahkan ke halaman Xendit Test.
5. Klik **Simulate Payment Success** di Xendit.
6. Kembali ke halaman order (`/order/[code]`), status akan otomatis berubah menjadi **Lunas** (*paid*).
7. Buka panel admin `/admin/orders`, order baru akan muncul di Antrean Dapur secara *real-time*.
