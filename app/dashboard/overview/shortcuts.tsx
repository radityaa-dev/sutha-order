import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { ArrowRight, BarChart2, MonitorIcon, TableIcon, UtensilsIcon } from 'lucide-react'

const LINKS = [
  {
    href: '/admin',
    label: 'Metrik bisnis',
    detail: 'Pendapatan, arus kas, transaksi terbaru, top menu',
    icon: BarChart2,
  },
  {
    href: '/dashboard/reports',
    label: 'Laporan',
    detail: 'Rentang tanggal, laba rugi, metode bayar',
    icon: BarChart2,
  },
  {
    href: '/dashboard/monitor',
    label: 'Monitor kasir',
    detail: 'Shift aktif dan rekap hari ini',
    icon: MonitorIcon,
  },
  {
    href: '/dashboard/tables',
    label: 'Meja & denah',
    detail: 'Status meja, pindah, split dan gabung tagihan',
    icon: TableIcon,
  },
  {
    href: '/admin/menus',
    label: 'Katalog menu',
    detail: 'Menu, kategori, add-on, dan paket',
    icon: UtensilsIcon,
  },
]

export function OverviewShortcuts() {
  return (
    <Card className="surface h-full">
      <CardHeader className="pb-2">
        <CardTitle className="type-title text-[15px] text-ink">Pintasan</CardTitle>
        <p className="text-[12px] text-ink-muted">Halaman yang paling sering dibuka.</p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-[var(--line)]">
          {LINKS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className="flex min-h-[56px] items-center gap-3 py-3 transition-colors hover:text-[var(--brand-700)]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--brand-700)]" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{item.label}</span>
                    <span className="block truncate text-[12px] text-ink-muted">{item.detail}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}