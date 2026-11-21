'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Area, AreaChart, CartesianGrid, XAxis, YAxis,
} from 'recharts'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '../../../components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  ArrowRight, Loader2,
} from 'lucide-react'
import { formatRupiah } from '../../../lib/format'
import { cn } from '../../../lib/utils'
import { getAdminDashboard, type Period } from '../actions'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari Terakhir' },
  { key: 'month', label: 'Bulan Ini' },
]

const METHOD_LABELS: Record<string, string> = {
  qris_xendit: 'QRIS Xendit', cash: 'Tunai', qris_manual: 'QRIS Manual',
  transfer: 'Transfer', edc_card: 'EDC', xendit_online: 'Xendit', unknown: 'Lainnya',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-blue-50 text-blue-700 border-blue-200',
  preparing: 'bg-orange-50 text-orange-700 border-orange-200',
  ready: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-neutral-100 text-ink-muted border-neutral-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-red-50 text-red-600 border-red-200',
}

export function DashboardContent() {
  const [period, setPeriod] = useState<Period>('today')
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminDashboard(p)
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const chartConfig: ChartConfig = {
    income: { label: 'Pemasukan', color: '#8A4A12' },
    expense: { label: 'Pengeluaran', color: '#2A1608' },
  }

  return (
    <div className="space-y-4">
      {/* Filter periode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="type-display text-[18px] text-ink md:text-[20px]">Metrik periode</h2>
          <p className="text-[13px] text-ink-muted">
            {data ? PERIODS.find((p) => p.key === data.period)?.label : 'Memuat data…'}
          </p>
        </div>
        <div className="flex gap-1 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'h-10 rounded-[var(--radius-sm)] px-3 text-[13px] font-medium transition-colors',
                period === p.key
                  ? 'bg-[var(--brand-700)] text-white'
                  : 'text-ink/70 hover:bg-[var(--surface-sunken)]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" /> Memuat data dashboard...
        </div>
      ) : data ? (
        <>
          {/* Baris 1: satu metrik dominan + tiga metrik pendukung */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Card className="surface flex h-full flex-col justify-between p-6">
                <div>
                  <p className="type-label text-[13px] text-ink-muted">Total pendapatan</p>
                  <p className="type-hero mt-3 text-[40px] text-ink md:text-[52px]">
                    {formatRupiah(data.kpis.revenue)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {data.kpis.revenuePrev > 0 ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[12px] font-semibold',
                          data.kpis.revenueDeltaPct >= 0
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : 'bg-[var(--danger-soft)] text-[var(--danger)]'
                        )}
                      >
                        {data.kpis.revenueDeltaPct >= 0 ? '+' : '−'}
                        {Math.abs(data.kpis.revenueDeltaPct)}%
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-faint">tanpa pembanding</span>
                    )}
                    <span className="text-[13px] text-ink-muted">
                      {data.kpis.txnCount} transaksi lunas
                    </span>
                  </div>
                </div>
                <p className="mt-4 border-t border-[var(--line)] pt-3 text-[12px] text-ink-faint">
                  Periode {PERIODS.find((p) => p.key === data.period)?.label?.toLowerCase()}
                </p>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
              <MiniStat
                label="Pemasukan − pengeluaran"
                value={formatRupiah(data.kpis.netProfit)}
                note={`Pengeluaran ${formatRupiah(data.kpis.expenses)}`}
                negative={data.kpis.netProfit < 0}
              />
              <MiniStat
                label="Rata-rata per order"
                value={formatRupiah(data.kpis.aov)}
                note={`${data.kpis.orderCount} order masuk`}
              />
              <MiniStat
                label="Antrean aktif"
                value={`${data.kpis.queueCount}`}
                note={`Meja terisi ${data.kpis.occupiedTables}/${data.kpis.totalTables}`}
              />
            </div>
          </div>

          {/* Baris 2: Arus kas + metode */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <Card className="sutha-card h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-ink">Arus Kas</CardTitle>
                    <p className="text-xs text-ink-muted">Pemasukan vs Pengeluaran</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-ink-muted">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[var(--brand-700)]" /> Pemasukan</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ink" /> Pengeluaran</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {data.cashflow.every((d) => d.income === 0 && d.expense === 0) ? (
                    <EmptyState text="Belum ada transaksi pada periode ini." />
                  ) : (
                    <ChartContainer config={chartConfig} className="h-[240px] w-full">
                      <AreaChart data={data.cashflow} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8A4A12" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#8A4A12" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2A1608" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#2A1608" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8A7A6D' }} />
                        <YAxis
                          tickLine={false} axisLine={false} width={56}
                          tick={{ fontSize: 11, fill: '#8A7A6D' }}
                          tickFormatter={(v: number) => (v >= 1_000_000 ? `${Math.round(v / 100000) / 10}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v))}
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent
                            formatter={(value, _n, item) => (
                              <div className="flex w-full items-center justify-between gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ background: item?.color }} />
                                  {item?.name}
                                </span>
                                <span className="font-medium tabular-nums">{formatRupiah(Number(value))}</span>
                              </div>
                            )}
                          />}
                        />
                        <Area type="monotone" dataKey="income" stroke="#8A4A12" strokeWidth={2} fill="url(#fillIncome)" />
                        <Area type="monotone" dataKey="expense" stroke="#2A1608" strokeWidth={2} fill="url(#fillExpense)" />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4">
              <Card className="sutha-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-ink">Metode Bayar & Sumber</CardTitle>
                  <p className="text-xs text-ink-muted">Proporsi periode terpilih</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2.5">
                    {data.paymentMethods.length === 0 && <p className="text-xs text-ink-faint">Belum ada pembayaran.</p>}
                    {data.paymentMethods.map((m) => (
                      <div key={m.method}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-ink">{m.label}</span>
                          <span className="tabular-nums text-ink-muted">{m.pct}% · {formatRupiah(m.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                          <div className="h-full rounded-full bg-[var(--brand-700)]" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--line)] pt-3">
                    <p className="sutha-label mb-2">Sumber Order</p>
                    <div className="space-y-2.5">
                      {data.orderSources.length === 0 && <p className="text-xs text-ink-faint">Belum ada order.</p>}
                      {data.orderSources.map((s) => (
                        <div key={s.source}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-medium text-ink">{s.label}</span>
                            <span className="tabular-nums text-ink-muted">{s.pct}% · {s.count} order</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                            <div className="h-full rounded-full bg-[var(--brand-300)]" style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Baris 3: transaksi + top menu */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Card className="sutha-card h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-ink">Transaksi Terbaru</CardTitle>
                  <a href="/admin/orders" className="flex items-center gap-0.5 text-xs font-medium text-[var(--brand-700)] hover:underline">
                    Lihat Semua <ArrowRight className="h-3 w-3" />
                  </a>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.recentOrders.length === 0 ? (
                    <EmptyState text="Belum ada transaksi pada periode ini." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--line)] text-left text-[11px] uppercase tracking-wider text-ink-faint">
                            <th className="py-2 pr-2 font-semibold">Order</th>
                            <th className="py-2 pr-2 font-semibold">Pelanggan</th>
                            <th className="py-2 pr-2 font-semibold">Meja</th>
                            <th className="py-2 pr-2 text-right font-semibold">Total</th>
                            <th className="py-2 pr-2 font-semibold">Bayar</th>
                            <th className="py-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentOrders.map((o) => (
                            <tr key={o.id} className="border-b border-[var(--line)] last:border-0">
                              <td className="py-2 pr-2 font-medium tabular-nums text-ink">
                                #{String(o.short_number).padStart(3, '0')}
                              </td>
                              <td className="max-w-[120px] truncate py-2 pr-2 text-ink">{o.customer_name}</td>
                              <td className="py-2 pr-2 text-ink-muted">{o.table_name || 'Walk-in'}</td>
                              <td className="py-2 pr-2 text-right font-medium tabular-nums text-ink">{formatRupiah(o.total)}</td>
                              <td className="py-2 pr-2 text-xs text-ink-muted">{METHOD_LABELS[o.method] || o.method}</td>
                              <td className="py-2">
                                <Badge variant="outline" className={cn('border text-[10px] capitalize', STATUS_STYLES[o.order_status] || 'border-neutral-200 bg-neutral-50 text-ink-muted')}>
                                  {o.order_status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-5">
              <Card className="sutha-card h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-ink">Top 5 Menu Terlaris</CardTitle>
                  <p className="text-xs text-ink-muted">Berdasarkan porsi terjual</p>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.topMenus.length === 0 ? (
                    <EmptyState text="Belum ada penjualan pada periode ini." />
                  ) : (
                    <div className="space-y-1">
                      {data.topMenus.map((m, i) => (
                        <div
                          key={m.name}
                          className={cn(
                            'flex items-center gap-3 rounded-[var(--radius-lg)] px-2 py-2',
                            i === 0 && 'bg-[var(--brand-700)]/5'
                          )}
                        >
                          <div className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            i === 0 ? 'bg-[var(--brand-700)] text-white' : 'bg-[var(--surface-sunken)] text-ink'
                          )}>
                            {i + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                            <p className="text-xs text-ink-muted">{m.qty} porsi</p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                            {formatRupiah(m.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function MiniStat({
  label, value, note, negative = false,
}: {
  label: string
  value: string
  note: string
  negative?: boolean
}) {
  return (
    <Card className="surface flex flex-col justify-between p-4">
      <p className="type-label text-[12px] text-ink-muted">{label}</p>
      <div className="mt-3">
        <p
          className={cn(
            'type-display type-money text-[22px] md:text-[26px]',
            negative ? 'text-[var(--danger)]' : 'text-ink'
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 text-[12px] text-ink-faint">{note}</p>
      </div>
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center gap-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--line)] px-6">
      <p className="max-w-[260px] text-center text-[13px] text-ink-muted">{text}</p>
      <a
        href="/dashboard/reports"
        className="text-[13px] font-medium text-[var(--brand-700)] underline underline-offset-4"
      >
        Buka laporan
      </a>
    </div>
  )
}