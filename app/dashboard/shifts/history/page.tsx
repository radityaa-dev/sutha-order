'use client'

import { useEffect, useState } from 'react'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { formatRupiah } from '../../../../lib/format'
import { cn } from '../../../../lib/utils'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getShiftHistory, markShiftReviewed, type ShiftHistoryRow } from './actions'

export default function ShiftHistoryPage() {
  const [rows, setRows] = useState<ShiftHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = () =>
    getShiftHistory()
      .then(setRows)
      .catch((e: any) => toast.error(e.message || 'Gagal memuat'))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  async function review(id: string) {
    setBusyId(id)
    try {
      await markShiftReviewed(id)
      toast.success('Shift ditandai sudah ditinjau')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <p className="text-sm text-neutral-500">Rekap semua shift kasir dan selisih kas.</p>
      </div>

      <Card className="sutha-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-[var(--ink)]">100 shift terakhir</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">Belum ada shift.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kasir</TableHead>
                    <TableHead>Dibuka</TableHead>
                    <TableHead>Ditutup</TableHead>
                    <TableHead className="text-right">Modal</TableHead>
                    <TableHead className="text-right">Tunai</TableHead>
                    <TableHead className="text-right">Non-Tunai</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const hasDiff = r.cash_difference !== null && r.cash_difference !== 0
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-[var(--ink)]">{r.cashier}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-neutral-600">
                          {new Date(r.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-neutral-600">
                          {r.closed_at
                            ? new Date(r.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(r.opening_cash)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(r.total_cash)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(r.total_non_cash)}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium tabular-nums',
                            hasDiff ? 'text-red-600' : 'text-neutral-500'
                          )}
                        >
                          {r.cash_difference === null ? '—' : formatRupiah(r.cash_difference)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'open' ? 'default' : 'outline'} className="text-[10px]">
                            {r.status === 'open' ? 'Aktif' : 'Ditutup'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {hasDiff && !r.reviewed_at ? (
                            <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => review(r.id)}>
                              {busyId === r.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <><CheckCircle2 className="h-3 w-3 mr-1" /> Tinjau</>}
                            </Button>
                          ) : r.reviewed_at ? (
                            <span className="text-[11px] text-green-700">Sudah ditinjau</span>
                          ) : (
                            <span className="text-[11px] text-neutral-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}