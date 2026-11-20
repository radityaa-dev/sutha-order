'use client'

import { useState } from 'react'
import { getSalesReport } from './actions'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { formatRupiah } from '../../../../lib/format'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '../../../../lib/utils'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [range, setRange] = useState<'daily' | 'monthly'>('daily')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  async function loadReport() {
    setLoading(true)
    try {
      const res = await getSalesReport(range, date)
      setData(res)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat laporan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="type-display text-[22px] text-ink md:text-[26px]">Laporan &amp; analitik</h1>
        <select className="h-11 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[14px]" value={range} onChange={(e) => setRange(e.target.value as any)}>
          <option value="daily">Harian</option>
          <option value="monthly">Bulanan</option>
        </select>
        <input type="date" className="h-11 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[14px]" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button className="h-11 rounded-[var(--radius-sm)] px-4 text-[14px] font-semibold" onClick={loadReport} disabled={loading}>Muat laporan</Button>
      </div>

      {data && (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Total Penjualan" value={formatRupiah(data.summary.totalSales)} />
            <StatCard title="Total Pengeluaran" value={formatRupiah(data.summary.totalExpenses)} />
            <StatCard title="Laba Rugi" value={formatRupiah(data.summary.netProfit)} className={data.summary.netProfit < 0 ? 'text-destructive' : ''} />
            <StatCard title="Total Order" value={data.summary.orderCount} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Menu Terlaris</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.topMenus.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{i + 1}. {m.name}</span>
                    <span className="font-medium">{m.qty} porsi</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, className }: { title: string; value: string | number; className?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><p className={cn("type-display type-money text-[24px] text-ink", className)}>{value}</p></CardContent>
    </Card>
  )
}