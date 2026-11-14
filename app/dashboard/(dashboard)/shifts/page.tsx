'use client'

import { useEffect, useState } from 'react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { formatRupiah } from '../../../../lib/format'
import { toast } from 'sonner'
import { getMyShift, doOpenShift, doCloseShift } from './actions'

export default function ShiftsPage() {
  const [shift, setShift] = useState<any>(null)
  const [openingCash, setOpeningCash] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      const s = await getMyShift()
      setShift(s)
    } catch {
      toast.error('Gagal memuat shift')
    }
  }
  useEffect(() => { load() }, [])

  async function open() {
    const cash = Number(openingCash)
    if (isNaN(cash) || cash < 0) { toast.error('Modal awal tidak valid'); return }
    setLoading(true)
    try {
      await doOpenShift(cash)
      toast.success('Shift dibuka')
      setOpeningCash('')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal buka shift')
    } finally {
      setLoading(false)
    }
  }

  async function close() {
    const cash = Number(countedCash)
    if (isNaN(cash) || cash < 0) { toast.error('Hitungan kas tidak valid'); return }
    setLoading(true)
    try {
      const res = await doCloseShift(shift.id, cash)
      toast.success(`Shift ditutup. Selisih ${formatRupiah(res.cash_difference)}`)
      setCountedCash('')
      load()
    } catch (e: any) {
      toast.error(e.message || 'Gagal tutup shift')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shift Kasir</h1>
        {shift && (
          <Badge variant={shift.status === 'open' ? 'default' : 'secondary'}>
            {shift.status === 'open' ? 'Shift Aktif' : 'Shift Ditutup'}
          </Badge>
        )}
      </div>

      {!shift || shift.status === 'closed' ? (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Buka Shift</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Modal Awal (Rp)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="200000"
                className="mt-1"
              />
            </div>
            <Button onClick={open} disabled={loading} className="w-full">
              {loading ? 'Membuka...' : 'Buka Shift'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Rekap */}
          <Card>
            <CardHeader>
              <CardTitle>Rekap Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Row label="Dibuka" value={new Date(shift.opened_at).toLocaleString()} />
              <Row label="Modal Awal" value={formatRupiah(shift.opening_cash)} />
              <Row label="Total Tunai" value={formatRupiah(shift.total_cash || 0)} />
              <Row label="Total Non-Tunai" value={formatRupiah(shift.total_non_cash || 0)} />
              <div className="border-t pt-2">
                <Row label="Expected Kas" value={formatRupiah((shift.opening_cash || 0) + (shift.total_cash || 0))} bold />
              </div>
            </CardContent>
          </Card>

          {/* Tutup */}
          <Card>
            <CardHeader>
              <CardTitle>Tutup Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Hitungan Kas (counted_cash)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <Button variant="destructive" onClick={close} disabled={loading} className="w-full">
                {loading ? 'Menutup...' : 'Tutup Shift'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Menutup shift mengunci rekap. Selisih = counted_cash − expected kas.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'}>{value}</span>
    </div>
  )
}
