'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { MonitorIcon, LogOut, ClockIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard/overview': 'Beranda',
  '/admin': 'Metrik bisnis',
  '/dashboard/monitor': 'Monitor Kasir',
  '/dashboard/shifts/history': 'Riwayat Shift',
  '/dashboard/pos': 'Kasir POS',
  '/dashboard/shifts': 'Shift Saya',
  '/admin/orders': 'Order Masuk',
  '/admin/tables': 'Meja & QR Code',
  '/dashboard/tables': 'Denah Meja',
  '/dashboard/reservations': 'Reservasi',
  '/dashboard/kitchen': 'Dapur & Bar',
  '/admin/menus': 'Menu',
  '/admin/categories': 'Kategori',
  '/admin/modifiers': 'Add-on',
  '/dashboard/bundles': 'Paket Bundle',
  '/dashboard/expenses': 'Pengeluaran',
  '/dashboard/reports': 'Laporan',
  '/dashboard/users': 'Staf',
  '/dashboard/logs': 'Log Audit',
}

/** Cocokkan prefix terpanjang agar /dashboard/shifts/history tidak jatuh ke /dashboard/shifts. */
function titleForPath(pathname: string): string {
  let best = ''
  for (const key of Object.keys(PAGE_TITLES)) {
    const hit = pathname === key || pathname.startsWith(key + '/')
    if (hit && key.length > best.length) best = key
  }
  return best ? PAGE_TITLES[best] : 'Sutha Corner'
}

interface ShiftInfo {
  id: string
  status: string
  opened_at: string
}

export function AdminTopbar() {
  const pathname = usePathname()
  const [shift, setShift] = useState<ShiftInfo | null>(null)
  const [user, setUser] = useState<{ full_name?: string; role?: string; email?: string } | null>(null)
  const [shiftLoaded, setShiftLoaded] = useState(false)

  // Satu permintaan ringan; sidebar memakai endpoint yang sama (di-cache browser
  // untuk permintaan bersamaan sehingga tidak menambah round-trip).
  useEffect(() => {
    let active = true
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return
        setUser({ full_name: d.full_name, role: d.role, email: d.email })
        if (d.has_shift) setShift({ id: 'active', status: 'open', opened_at: '' })
        setShiftLoaded(true)
      })
      .catch(() => { if (active) setShiftLoaded(true) })
    return () => { active = false }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  const title = titleForPath(pathname)
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  // Kasir saja yang punya shift & tombol Buka POS. Admin memantau lewat Monitor Kasir.
  const isKasir = user?.role === 'kasir'
  const hasShift = !!shift

  return (
    <header className="sticky top-0 z-40 flex h-16 min-w-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--canvas)]/85 px-3 backdrop-blur-md md:gap-4 md:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold text-ink md:text-lg">{title}</h1>
        <p className="hidden truncate text-xs text-ink-muted sm:block">{today}</p>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 md:gap-3">
        {/* Indikator shift + CTA: hanya untuk kasir (admin memakai Monitor Kasir) */}
        {isKasir && (
          <>
            <div
              className={cn(
                'hidden items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[12px] font-medium sm:flex',
                hasShift
                  ? 'border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]'
                  : 'border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]'
              )}
            >
              <ClockIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {shiftLoaded ? (hasShift ? 'Shift aktif' : 'Belum buka shift') : 'Memuat…'}
            </div>

            <Link href="/dashboard/pos">
              <Button className="h-11 rounded-[var(--radius-sm)] px-3 text-[13px] font-semibold">
                <MonitorIcon className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Buka kasir</span>
                <span className="sm:hidden">Kasir</span>
              </Button>
            </Link>
          </>
        )}

        {/* User chip */}
        <div className="flex items-center gap-2">
          <div className="hidden max-w-[160px] items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 lg:flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-700)]/10 text-[11px] font-semibold text-[var(--brand-700)]">
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-medium text-ink">{user?.full_name || 'Pengguna'}</p>
              <p className="truncate text-[10px] text-ink-faint capitalize">{user?.role || '-'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-[var(--radius-sm)] text-ink hover:bg-[var(--surface-sunken)]"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}