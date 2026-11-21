# Sutha Corner

Sistem pemesanan makanan untuk kantin dan warung makan. Pelanggan memindai kode QR di meja untuk melihat menu dan memesan, kasir mencatat pesanan di layar POS, dan pesanan masuk ke layar dapur. Pembayaran dapat dilakukan lewat Xendit (online atau QRIS) maupun tunai di kasir.

Aplikasi dibangun dengan Next.js 16, React 19, Supabase (PostgreSQL, Auth, Storage), dan Xendit.

## Siapa saja penggunanya

Ada empat peran staf, dan setiap peran hanya melihat menu yang menjadi tugasnya.

Admin mengelola seluruh sistem: katalog menu, kategori, add-on, paket bundling, meja dan kode QR, akun staf beserta PIN otorisasi, pengeluaran, laporan, serta log aktivitas. Admin juga memantau shift kasir dan menyetujui hal yang butuh persetujuan, seperti pembatalan pesanan atau diskon.

Kasir menjalankan layar POS. Kasir menerima pesanan langsung dari pelanggan di meja, menerima pembayaran tunai atau QRIS, mengelola tagihan yang belum dibayar (open bill), memindahkan pesanan antar meja, memisah atau menggabungkan tagihan, serta membuka dan menutup shift sendiri.

Dapur melihat antrean pesanan yang perlu dikerjakan dan mengubah statusnya dari diproses menjadi siap. Kasir, admin, dan stakeholder dapat melihat antrean yang sama tetapi tidak mengubah statusnya.

Stakeholder hanya melihat: laporan penjualan, pengeluaran, riwayat shift, dan log. Tidak ada data yang bisa diubah.

## Alur pelanggan

Pelanggan memindai kode QR di meja dan langsung masuk ke daftar menu untuk meja tersebut. Menu dikelompokkan per kategori dan dapat dicari. Setiap menu bisa memiliki pilihan tambahan seperti level pedas atau topping, dengan aturan wajib-isi dan batas jumlah pilihan.

Setelah memilih, pelanggan mengisi nama dan cara penyajian (ambil sendiri, antar meja, atau antar gedung), lalu memilih salah satu dari dua cara bayar.

Bayar sekarang berarti pelanggan diarahkan ke halaman pembayaran Xendit. Pesanan baru masuk ke dapur setelah pembayaran dikonfirmasi. Bila pembayaran tidak diselesaikan dalam batas waktu, pesanan kedaluwarsa dan pelanggan dapat membayar ulang.

Ajukan open bill berarti pesanan dicatat dulu dan pelanggan membayar di kasir saat selesai. Pesanan menunggu persetujuan kasir sebelum masuk ke dapur.

Halaman status pesanan menampilkan nomor pesanan yang besar, tahapan pesanan, dan rincian item. Selama pelanggan membuka halaman itu, status diperbarui otomatis. Saat pesanan siap, halaman berbunyi dan bergetar. Pelanggan yang memilih open bill dan sudah disetujui dapat menambah pesanan dari halaman yang sama, dan tambahan itu langsung masuk ke dapur.

## Alur kasir

Layar POS menampilkan daftar menu di sisi kiri dan keranjang di sisi kanan. Kasir memilih menu, memilih varian atau add-on bila ada, lalu mengisi nama pelanggan dan meja bila pelanggan duduk di meja.

Pembayaran di POS hanya dua pilihan: tunai atau QRIS. Untuk tunai, kasir memasukkan uang yang diterima dan sistem menghitung kembalian. Untuk QRIS, sistem meminta kode QR ke Xendit, menampilkannya di layar, dan memantau pembayaran secara otomatis. Bila QR kedaluwarsa, kasir dapat membuat QR baru.

Kasir juga dapat menyimpan pesanan sebagai open bill tanpa pembayaran. Tagihan itu muncul di daftar open bill, dan kasir dapat menambahkan item, memberi diskon, membatalkan pesanan, atau melunasinya saat pelanggan selesai.

Penerimaan pembayaran mewajibkan shift aktif. Kasir membuka shift dengan mencatat modal awal, dan menutupnya dengan menghitung uang fisik. Sistem menghitung selisih kas terhadap perkiraan, dan admin dapat meninjau selisih itu di riwayat shift.

## Alur dapur

Layar dapur menampilkan pesanan yang sudah dibayar atau disetujui, diurutkan dari yang paling lama menunggu. Setiap kartu memuat nomor pesanan, nama pelanggan, nomor meja, cara penyajian, daftar item beserta add-on dan catatan.

Pesanan yang menunggu lebih dari tiga puluh menit ditandai merah agar tidak terlewat. Status pesanan berjalan satu arah: menunggu, diproses, siap, lalu selesai.

Ada juga layar antrean publik yang bisa ditampilkan di area tunggu. Layar itu hanya menampilkan nomor pesanan yang sudah siap dan inisial nama pemesan, tanpa harga maupun rincian, dan nomor itu hilang setelah kasir menandai pesanan selesai.

## Pembayaran

Pembayaran online memakai invoice Xendit. Setiap invoice punya nomor referensi unik, dan bila pelanggan perlu membayar ulang, nomor itu diberi akhiran percobaan kedua dan ketiga. Status pembayaran disinkronkan lewat dua jalur: notifikasi dari Xendit dan pemeriksaan berkala dari aplikasi. Keduanya aman dijalankan bersamaan karena proses pencatatan pembayaran bersifat idempoten, artinya pembayaran yang sama tidak akan tercatat dua kali.

Pembayaran QRIS di kasir juga lewat Xendit. Kode QR bersifat dinamis dan hanya berlaku untuk satu tagihan. Bila pembayaran masuk setelah kode kedaluwarsa atau setelah tagihan lunas, pembayaran ditandai untuk pengembalian dana dan dicatat di log.

Jumlah uang yang diterima selalu dicocokkan dengan total tagihan yang tercatat di database sebelum pesanan dinyatakan lunas. Bila jumlahnya tidak sama, pesanan ditandai bermasalah, bukan dilunasi.

## Pengawasan dan laporan

Setiap perubahan penting tercatat di log aktivitas: siapa yang melakukannya, apa yang diubah, dan kapan. Pembatalan pesanan memiliki catatan tersendiri berisi alasan dan admin yang menyetujui.

Diskon dan pembatalan pesanan memerlukan PIN admin. Kasir tidak dapat melakukannya sendiri, dan alasan wajib diisi.

Halaman laporan menampilkan penjualan pada rentang tanggal tertentu, rincian metode pembayaran, total pengeluaran, laba rugi sederhana, serta menu terlaris dan menu yang kurang laku. Laba rugi dihitung dari pemasukan dikurangi pengeluaran, dan transaksi yang dibatalkan tidak dihitung sebagai pemasukan.

Halaman utama admin menampilkan hal-hal yang menunggu keputusan: pembayaran yang perlu dikembalikan, pesanan bermasalah, selisih kas yang belum ditinjau, dan permintaan pembatalan.

## Struk dan tiket

Aplikasi dapat mencetak struk pelanggan dan tiket dapur pada printer thermal 58 mm. Pencetakan mencoba koneksi Bluetooth terlebih dahulu; bila tidak tersedia, aplikasi membuka dialog cetak browser dengan tata letak yang sudah disesuaikan untuk kertas 58 mm. Tiket dapur dan tiket bar dapat dicetak terpisah.

## Teknologi

Next.js 16 dengan App Router dan Turbopack, React 19, TypeScript, Tailwind CSS 4, komponen antarmuka berbasis shadcn/ui, serta Zustand untuk keranjang belanja. Basis data dan autentikasi memakai Supabase, dengan aturan akses tingkat baris (RLS) dan fungsi PostgreSQL untuk logika yang harus dijalankan di server, seperti perhitungan harga, pembuatan pesanan, dan pencatatan pembayaran. Pembayaran memakai Xendit.

## Menjalankan aplikasi

Siapkan berkas `.env.local` di direktori utama dengan isi berikut.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
XENDIT_SECRET_KEY=...
XENDIT_WEBHOOK_TOKEN=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Nilai `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, dan `XENDIT_WEBHOOK_TOKEN` bersifat rahasia dan hanya boleh berada di server. Jangan menaruhnya di variabel yang berawalan `NEXT_PUBLIC_`, karena nilai itu ikut terkirim ke browser.

Selanjutnya jalankan migrasi SQL di `supabase/migrations/` secara berurutan di SQL Editor Supabase, mulai dari berkas `001` sampai berkas terakhir. Setelah itu pasang dependensi dan jalankan server pengembangan.

```
npm install
npm run dev
```

Aplikasi dapat dibuka di `http://localhost:3000`.

Untuk membuat akun staf pertama, daftarkan pengguna lewat menu Authentication di dashboard Supabase, lalu jalankan `supabase/seed_admin.sql` agar profilnya terbentuk di tabel `user_profiles`. Setelah itu peran dan PIN admin dapat diatur dari halaman Staf di dalam aplikasi.

## Catatan konfigurasi Xendit

Kanal pembayaran harus diaktifkan di dashboard Xendit sebelum aplikasi dapat membuat tagihan. Untuk pembayaran online, daftarkan alamat webhook `https://domain-anda/api/xendit/webhook`. Untuk QRIS di kasir, daftarkan alamat `https://domain-anda/api/xendit/qr-webhook` dan pilih kejadian pembayaran QR berhasil. Token dari masing-masing webhook disimpan sebagai `XENDIT_WEBHOOK_TOKEN`.

Bila kanal belum aktif atau kunci API tidak memiliki izin, aplikasi menampilkan pesan yang menjelaskan masalahnya dan menyarankan pembayaran tunai sebagai gantinya. Status pesanan tidak berubah dalam keadaan itu.

## Data contoh

Berkas `scripts/seed-demo.sql` mengisi basis data uji dengan pesanan, pengeluaran, dan shift contoh agar tampilan laporan dan dasbor tidak kosong. Semua baris yang dibuatnya ditandai `is_demo` sehingga dapat dihapus dengan mudah. Berkas ini tidak dijalankan otomatis dan tidak untuk digunakan pada basis data produksi.