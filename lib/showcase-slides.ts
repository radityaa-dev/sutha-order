/**
 * Foto slideshow di panel kiri halaman login.
 *
 * TARUH FOTO DI: public/images/showcase/  (sudah dinamai menu-1.jpg … menu-8.jpg)
 *
 * `src`    : path foto di public/
 * `alt`    : deskripsi singkat untuk pembaca layar. Boleh dikosongkan ('').
 * `caption`: teks yang tampil di foto. Boleh dihilangkan sepenuhnya.
 *
 * Tanpa caption, foto tampil bersih — hanya gambar.
 * Foto yang tidak ditemukan dilewati otomatis; bila semua tidak ada,
 * panel kembali menampilkan tiket struk.
 */
export const SHOWCASE_SLIDES: { src: string; alt: string; caption?: string }[] = [
  { src: '/images/showcase/menu-1.jpg', alt: '' },
  { src: '/images/showcase/menu-2.jpg', alt: '' },
  { src: '/images/showcase/menu-3.jpg', alt: '' },
  { src: '/images/showcase/menu-4.jpg', alt: '' },
  { src: '/images/showcase/menu-5.jpg', alt: '' },
  { src: '/images/showcase/menu-6.jpg', alt: '' },
  { src: '/images/showcase/menu-7.jpg', alt: '' },
  { src: '/images/showcase/menu-8.jpg', alt: '' },
]

/** Interval pergantian slide (ms). */
export const SHOWCASE_INTERVAL_MS = 4500