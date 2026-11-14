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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Laporan & Analitik</h1>
        <select className="h-8 rounded-lg border px-2 text-sm" value={range} onChange={(e) => setRange(e.target.value as any)}>
          <option value="daily">Harian</option>
          <option value="monthly">Bulanan</option>
        </select>
        <input type="date" className="h-8 rounded-lg border px-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button onClick={loadReport} disabled={loading}>Muat Laporan</Button>
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
      <CardContent><p className={cn("text-2xl font-bold", className)}>{value}</p></CardContent>
    </Card>
  )
}