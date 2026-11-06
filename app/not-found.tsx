import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h2 className="text-4xl font-bold mb-4">404 - Halaman Tidak Ditemukan</h2>
      <p className="text-muted-foreground mb-8">Maaf, halaman yang Anda cari tidak tersedia.</p>
      <Button>
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  )
}
