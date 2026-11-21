'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { formatRupiah } from '../../../lib/format'
import { Loader2, Clock, Wallet, QrCode, Receipt, AlertCircle } from 'lucide-react'
import { getCashierMonitor } from '../shifts/history/actions'

type Monitor = Awaited<ReturnType<typeof getCashierMonitor>>

export default function MonitorPage() {
  const [data, setData] = useState<Monitor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCashierMonitor()
      .then(setData)
      .catch((e: any) => setError(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Memuat monitor kasir...
      </div>
    )
  }
  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }
  if (!data) return null

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-neutral-500">Pantau shift aktif dan rekap hari ini (hanya lihat).</p>
        </div>
        <Link href="/dashboard/shifts/history" className="text-xs font-medium text-[var(--brand-700)] hover:underline">
          Riwayat Shift →
        </Link>
      </div>

      {/* Ringkasan hari ini */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} label="Transaksi Hari Ini" value={String(data.today.txn)} />
        <StatCard icon={Wallet} label="Total Tunai" value={formatRupiah(data.today.cash)} />
        <StatCard icon={QrCode} label="Total QRIS / Non-Tunai" value={formatRupiah(data.today.qris)} />
        <StatCard
          icon={AlertCircle}
          label="Open Bill Menunggu"
          value={String(data.today.pendingApproval)}
          tone={data.today.pendingApproval > 0 ? 'warn' : 'default'}
        />
      </div>

      {/* Shift aktif */}
      <Card className="sutha-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <Clock className="h-4 w-4 text-[var(--brand-700)]" /> Shift Aktif ({data.shifts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.shifts.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--canvas)] py-10 text-center">
              <p className="text-sm text-neutral-500">Tidak ada shift yang sedang terbuka.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-left text-[11px] uppercase tracking-wider text-neutral-400">
                    <th className="py-2 pr-2 font-semibold">Kasir</th>
                    <th className="py-2 pr-2 font-semibold">Dibuka</th>
                    <th className="py-2 pr-2 text-right font-semibold">Modal</th>
                    <th className="py-2 pr-2 text-right font-semibold">Transaksi</th>
                    <th className="py-2 pr-2 text-right font-semibold">Tunai</th>
                    <th className="py-2 text-right font-semibold">QRIS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.shifts.map((s) => (
                    <tr key={s.shift_id} className="border-b border-[var(--line)] last:border-0">
                      <td className="py-2 pr-2 font-medium text-[var(--ink)]">{s.cashier}</td>
                      <td className="whitespace-nowrap py-2 pr-2 text-xs text-neutral-600">
                        {new Date(s.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatRupiah(s.opening_cash)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{s.txn_count}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">{formatRupiah(s.total_cash)}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiah(s.total_qris)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, tone = 'default' }: {
  icon: any
  label: string
  value: string
  tone?: 'default' | 'warn'
}) {
  return (
    <Card className="sutha-card">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <Icon className={tone === 'warn' ? 'h-4 w-4 text-amber-600' : 'h-4 w-4 text-[var(--brand-700)]'} />
        </div>
        <p className="type-display type-money text-[22px] text-ink">{value}</p>
      </CardContent>
    </Card>
  )
}