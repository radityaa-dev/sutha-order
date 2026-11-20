import { guardPage } from '@/lib/guard-page'
import { NeedsAttentionPanel } from './needs-attention'
import { OverviewShortcuts } from './shortcuts'

/**
 * Beranda admin: yang perlu ditindak + pintasan.
 * Angka bisnis lengkap ada di /admin (Metrik) dan /dashboard/reports (Laporan),
 * supaya tidak ada dua halaman yang menampilkan isi sama.
 */
export default async function OverviewPage() {
  await guardPage('finance', 'full')

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="type-display text-[22px] text-ink md:text-[26px]">Beranda</h1>
        <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">
          Hal yang menunggu keputusan Anda, dan pintasan ke pekerjaan harian.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <NeedsAttentionPanel />
        </div>
        <div className="lg:col-span-5">
          <OverviewShortcuts />
        </div>
      </div>
    </div>
  )
}