# Sutha Corner — Design Brief

**Status:** usulan, menunggu persetujuan
**Ruang lingkup:** tata visual saja. Logika, route, query, dan data tidak disentuh.
**Tanggal:** 2026-11-19

---

## 0. Titik tolak

Sutha Corner adalah warung/kantin yang memakai QR di meja dan kasir fisik. Orang melihatnya sambil berdiri di depan meja, di bawah lampu warung, dengan tangan mungkin basah atau memegang HP dan nampan. Desainnya harus bekerja di kondisi itu: harga terbaca dari jarak satu lengan, tombol tidak salah tekan, dan warna tidak berteriak.

Arah visualnya diambil dari **foto logo sendiri**, bukan dari tren: logo `public/brand/logo.jpg` hampir seluruhnya satu keluarga warna — burnt umber ke cinnamon ke amber (48,7 % piksel di sekitar `#914811`). Itu warna bumbu dan arang, bukan warna dashboard SaaS. Palet di bawah dibangun dari situ.

> Catatan aset: file yang Anda sebut `public/brand/logo-source.png` tidak ada. Yang ada `public/brand/logo.jpg` (2160×2160, sumber warna di bawah) dan `public/images/sutha-logo.png` (256×256, dipakai sidebar). Kalau ada logo vektor/versi PNG beresolusi tinggi, kirimkan — saya pakai itu untuk turunan favicon/ikon.

---

## 1. Palet

Semua pasangan teks di bawah sudah dihitung kontrasnya (WCAG 2.1). Angka di kurung adalah rasio dan level.

### Merek (dari logo)

| Token | Hex | OKLCH | Pakai |
|---|---|---|---|
| `--brand-900` | `#6E3A0C` | `oklch(0.39 0.10 57)` | aksen tekan/hover, teks di atas amber |
| `--brand-700` | `#8A4A12` | `oklch(0.47 0.12 55)` | **aksen utama**, tombol primer, tautan aktif |
| `--brand-500` | `#A55B1C` | `oklch(0.55 0.13 56)` | garis aksen, indikator fokus |
| `--brand-300` | `#AD722B` | `oklch(0.62 0.11 66)` | grafik sekunder, badge lembut |
| `--brand-100` | `#F0E2D2` | `oklch(0.92 0.03 71)` | latar chip/tag |

Aksen `#8A4A12` sengaja lebih gelap dari `#B3521E` yang sekarang dipakai. Di atas putih, `#B3521E` hanya mencapai ~4,4 (di bawah AA untuk teks normal), sedangkan `#8A4A12` mencapai **6,84 (AA)**.

### Netral hangat

| Token | Hex | OKLCH | Pakai |
|---|---|---|---|
| `--canvas` | `#FBF7F0` | `oklch(0.97 0.008 78)` | latar halaman |
| `--surface` | `#FFFFFF` | `oklch(1 0 0)` | kartu, sheet |
| `--surface-sunken` | `#F4EDE3` | `oklch(0.94 0.015 78)` | area redup, header tabel |
| `--line` | `#E6DBCB` | `oklch(0.88 0.02 78)` | garis 1 px |
| `--ink` | `#2A1608` | `oklch(0.22 0.04 55)` | teks utama |
| `--ink-muted` | `#5A4432` | `oklch(0.38 0.04 55)` | teks sekunder |
| `--ink-faint` | `#8A7562` | `oklch(0.55 0.03 60)` | placeholder, hanya untuk teks ≥ 18 px |

### Status

| Token | Hex | Latar lembut | Kontras teks/latar |
|---|---|---|---|
| `--success` | `#2F6B46` | `#E8F1EA` | 6,34 AA |
| `--warning` | `#8A5A12` | `#FBF0DA` | 5,91 AA |
| `--danger` | `#9C2D22` | `#FBE9E6` | 7,47 AAA |
| `--info` | `#2B5580` | `#E8EFF6` | 7,74 AAA |

### Kontras terverifikasi

| Kombinasi | Rasio | Level |
|---|---|---|
| `--ink` di `--canvas` | 16,16 | AAA |
| `--ink` di `--surface` | 17,26 | AAA |
| `--ink-muted` di `--canvas` | 8,52 | AAA |
| `--ink-muted` di `--surface` | 9,10 | AAA |
| `--brand-700` di `--surface` | 6,84 | AA |
| putih di `--brand-700` | 6,84 | AA |
| putih di `--brand-900` | 9,24 | AAA |
| putih di `--danger` | 7,47 | AAA |

Aturan: **teks normal minimal 4,5:1; teks besar (≥ 18,66 px bold / ≥ 24 px) minimal 3:1.** `--ink-faint` tidak boleh dipakai untuk teks kecil.

---

## 2. Tipografi

Dua keluarga, peran jelas, keduanya variable dan tersedia di `next/font/google`.

| Peran | Font | Kenapa |
|---|---|---|
| Tampilan: judul, angka besar, harga | **Fraunces** (`opsz` 9–144, `wght` 100–900) | Serif optical-size tinggi; di ukuran besar terasa seperti papan menu warung yang dicetak bagus, bukan serif editorial generik. Angka Fraunces punya kontras tebal-tipis sehingga total Rp jadi elemen visual. |
| Teks: isi, label, tabel, tombol | **Plus Jakarta Sans** (`wght` 200–800) | Sans geometris dengan terminal sedikit hangat; dipakai luas di Indonesia sehingga terasa akrab, dan angka `tabular`-nya rapi untuk kolom uang. |

Keduanya bukan pasangan default (bukan Inter/Geist/Poppins). Fraunces sudah ada di tema lama, jadi tidak menambah beban baru.

### Skala (rem, basis 16 px)

| Token | Ukuran | Line-height | Berat | Pakai |
|---|---|---|---|---|
| `--text-hero` | 2,5 rem / 40 px | 1,05 | Fraunces 600, `opsz 96` | Nomor antrean `#012`, total pendapatan |
| `--text-display` | 1,75 rem / 28 px | 1,15 | Fraunces 600 | Judul halaman |
| `--text-title` | 1,25 rem / 20 px | 1,3 | Fraunces 600 | Judul kartu |
| `--text-body` | 0,9375 rem / 15 px | 1,55 | PJS 400 | Teks isi |
| `--text-body-strong` | 0,9375 rem / 15 px | 1,45 | PJS 600 | Nama menu, nama pemesan |
| `--text-label` | 0,8125 rem / 13 px | 1,35 | PJS 500 | Label form, sel tabel |
| `--text-micro` | 0,75 rem / 12 px | 1,3 | PJS 500, `+0.01em` | Keterangan, stempel waktu |

**Aturan angka:** semua nominal memakai Fraunces `tabular-nums` di `--text-hero`/`--text-display`, dan Plus Jakarta Sans `tabular-nums` (`font-variant-numeric: tabular-nums`) di ukuran kecil. Tidak ada nominal uang dalam font non-tabular.

**Aturan pemakaian:**
- Maksimal **dua tingkat berat** per layar (mis. 400 + 600).
- Huruf kapital hanya untuk label grup menu di sidebar admin (opsional), **bukan** untuk label form, tombol, atau badge.
- Tidak ada penekanan satu kata di tengah judul (italic/warna beda). Kalau satu bagian penting, pisahkan jadi baris sendiri atau ubah ukurannya.
- Panjang baris 55–75 karakter; teks serif maksimal 70.

---

## 3. Jarak, radius, bayangan

### Jarak (basis 4 px)

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 64

Aturan: dalam kartu 12–16 px; antar kartu 16 px (mobile) / 24 px (desktop); antar seksi 32–48 px. Satu jarak per hubungan — jangan campur 10/14/18.

### Radius

Hanya dua nilai:
- `--radius-sm: 8px` — input, badge, tombol kecil
- `--radius-lg: 14px` — kartu, sheet, dialog

Tidak ada radius 4/6/10/12 campur. Tombol besar memakai `--radius-lg`.

### Bayangan

Maksimal tiga tingkat, dan **hanya** untuk elevasi nyata:

| Token | Nilai | Pakai |
|---|---|---|
| `--shadow-0` | `none` | default semua kartu (pakai `--line` sebagai batas) |
| `--shadow-1` | `0 1px 2px rgba(42,22,8,.06)` | kartu yang bisa diklik |
| `--shadow-2` | `0 8px 24px rgba(42,22,8,.10)` | sheet, dialog, dropdown |

Kartu statis tidak diberi bayangan — garis 1 px `--line` sudah memisahkan. Ini menghilangkan "kartu identik berderet dengan shadow 0,1" yang jadi ciri template.

---

## 4. Aturan per konteks

### Pelanggan (`/m/[token]`, `/order/[token]`) — mobile dulu

- Lebar konten maksimal 480 px; padding tepi 16 px.
- **Foto menu adalah elemen utama:** kartu vertikal, gambar rasio 4:3 mengisi lebar, nama di bawah dalam `--text-body-strong`, harga dalam Fraunces `--text-title`.
- Satu tombol aksi per kartu, tinggi ≥ 44 px, rata kanan bawah kartu.
- Bilah keranjang menempel di bawah (`sticky bottom`), tinggi 56 px, harga total rata kiri, jumlah item rata kanan.
- Target sentuh minimal 44×44 px; jarak antar target ≥ 8 px.
- Status pesanan: nomor `#012` di `--text-hero` di bagian atas, stepper di bawahnya.

### Kasir POS — padat, cepat

- Dua kolom tetap: katalog (kiri, mengisi sisa) dan keranjang (kanan, 380–420 px). Tidak kolaps ke satu kolom di atas 1024 px.
- Semua tombol utama tinggi **48 px**; tombol angka/aksi sekunder ≥ 44 px.
- Grid menu 3–4 kolom; setiap sel: gambar 1:1 atau blok warna, nama 2 baris maksimal (`line-clamp-2`), harga tebal.
- Ringkasan tagihan **selalu terlihat** di dasar panel kanan: subtotal, jumlah item, total besar.
- Dialog bayar: metode sebagai dua tombol besar (Tunai/QRIS), nominal dan kembalian dalam Fraunces, area QR minimal 240 px.

### Dapur & Bar — dibaca dari jauh

- Nomor pesanan `--text-hero` (40 px) atau lebih.
- Nama menu minimal 18 px, tebal.
- Kontras: teks `--ink` di `--surface` (17,26) — jangan pakai abu-abu untuk item.
- Kartu pesanan terurut; aksi "Siap" satu tombol lebar penuh di dasar kartu.
- Keterlambatan: garis tepi 3 px `--danger` + label `--danger` di atas kartu. **Statis**, tanpa animasi berkedip.

### Antrean publik (`/queue`)

- Nomor pesanan ≥ 96 px Fraunces, di `--surface` dengan `--line`.
- Hanya nomor dan inisial — tanpa harga, tanpa item.
- Dua kolom di ≥ 1280 px, satu kolom di bawahnya.
- Tidak ada teks berjalan/marquee.

### Admin & stakeholder — tenang

- Satu metrik dominan per layar (mis. pendapatan hari ini) di `--text-hero`; sisanya `--text-display` ke bawah.
- Kartu tanpa bayangan; hierarki lewat ukuran angka dan jarak, bukan warna.
- Tabel: garis horizontal 1 px `--line`, tanpa garis vertikal, tanpa zebra.
- Grafik: satu warna aksen (`--brand-700`) + satu netral (`--ink`); tidak ada gradien pengisi kecuali opacity 35 %.

---

## 5. Ikon

- **Lucide saja**, satu set. Tidak ada emoji sebagai ikon.
- Ukuran: 16 px (dalam teks/label), 20 px (tombol), 24 px (navigasi utama). Tidak ada 18/22.
- Ketebalan `stroke-width: 1.75` di semua tempat.
- Ikon selalu mendampingi teks atau punya `aria-label`; tidak ada ikon dekoratif tanpa makna.
- **Tidak ada ikon di dalam lingkaran pastel** di setiap kartu statistik. Ikon diletakkan sebaris dengan label, atau dihilangkan kalau labelnya sudah jelas.

## 6. Empty state

Setiap empty state menjelaskan **langkah berikutnya**, bukan hanya "tidak ada data":

- Pola: satu kalimat apa yang kosong + satu kalimat tindakan + satu tautan/tombol.
- Contoh: "Belum ada transaksi hari ini. Buat pesanan dari kasir untuk mulai mengisi laporan." + tombol `Buka kasir`.
- Boleh memakai ilustrasi garis sederhana (SVG satu warna `--line`), **bukan** ikon panah/emoji yang sama di semua kartu.
- Tanpa ilustrasi juga boleh kalau teksnya sudah cukup jelas.

## 7. Animasi

- Durasi 120–180 ms, easing `cubic-bezier(.2,.8,.2,1)`.
- Hanya untuk umpan balik aksi: buka/tutup sheet, munculnya toast, perubahan status tombol, QR muncul.
- Tidak ada fade-and-slide-up pada tiap seksi saat halaman dimuat, tidak ada parallax, tidak ada loop.
- Hormati `prefers-reduced-motion: reduce` → semua transisi jadi 0 ms.

---

## 8. Yang dihindari

1. Gradien ungu-biru (atau gradien dekoratif apa pun).
2. Emoji sebagai ikon.
3. Deretan kartu identik tanpa hierarki — setiap kelompok harus punya satu angka/elemen yang jelas lebih penting.
4. Semua teks rata tengah; hanya nomor antrean dan empty state yang boleh rata tengah.
5. Bayangan berlapis (kartu + tombol + badge semuanya punya shadow).
6. Ikon di dalam lingkaran pastel di setiap kartu statistik.
7. Huruf kapital + tracking lebar untuk semua label.
8. Nomor urut `01/02/03` pada konten yang bukan urutan.
9. Satu kata di-italic/di-bold di tengah judul.
10. Warna aksen untuk teks panjang — aksen hanya untuk tautan, tombol, dan penanda aktif.

---

## 9. Ringkasan token (siap dipindah ke `globals.css`)

```
--canvas #FBF7F0   --surface #FFFFFF   --surface-sunken #F4EDE3   --line #E6DBCB
--ink #2A1608      --ink-muted #5A4432 --ink-faint #8A7562
--brand-900 #6E3A0C  --brand-700 #8A4A12  --brand-500 #A55B1C
--brand-300 #AD722B  --brand-100 #F0E2D2
--success #2F6B46  --warning #8A5A12  --danger #9C2D22  --info #2B5580

font-display: Fraunces     font-sans: Plus Jakarta Sans

space 4/8/12/16/24/32/48/64 · radius 8/14 · shadow 0/1/2
icon 16/20/24, stroke 1.75 · motion 120–180 ms
```

---

**Berhenti di sini — menunggu persetujuan sebelum Langkah 2 (penerapan ke kode).**