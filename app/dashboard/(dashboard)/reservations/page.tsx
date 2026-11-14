'use client'

import { useEffect, useState } from 'react'
import { getReservations, createReservation, updateReservationStatus, deleteReservation, releaseExpiredReservations, getAvailableTablesPublic } from '../tables/actions'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Badge } from '../../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Calendar, Clock, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Reservation {
  id: string
  table_id: string
  customer_name: string
  pax_count: number
  booking_time: string
  status: 'dipesan' | 'hadir' | 'batal' | 'tidak_hadir'
  notes?: string
  tables: { id: string; name: string; area: string }
  created_at: string
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    table_id: '',
    customer_name: '',
    pax_count: 2,
    booking_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    notes: '',
  })

  const loadData = async () => {
    try {
      const [res, tbl] = await Promise.all([getReservations(), getAvailableTablesPublic()])
      setReservations(res)
      setTables(tbl)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createReservation({
        table_id: form.table_id,
        customer_name: form.customer_name,
        pax_count: form.pax_count,
        booking_time: form.booking_time,
        notes: form.notes,
      })
      toast.success('Booking berhasil')
      setDialogOpen(false)
      setForm({
        table_id: '',
        customer_name: '',
        pax_count: 2,
        booking_time: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
        notes: ''
      })
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Gagal booking')
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateReservationStatus(id, status)
      toast.success('Status diperbarui')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus booking ini?')) return
    try {
      await deleteReservation(id)
      toast.success('Booking dihapus')
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    }
  }

  async function handleReleaseExpired() {
    try {
      const res = await releaseExpiredReservations()
      toast.success(`${res.released} booking dilepaskan`)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Booking / Reservasi Meja</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReleaseExpired} size="sm">
            <Clock className="h-4 w-4 mr-1" /> Cek & Lepaskan Expired
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Booking Baru
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waktu</TableHead>
                <TableHead>Meja</TableHead>
                <TableHead>Pemesan</TableHead>
                <TableHead>Pax</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(new Date(r.booking_time), 'dd MMM HH:mm')}
                  </TableCell>
                  <TableCell>{r.tables?.name} ({r.tables?.area})</TableCell>
                  <TableCell>{r.customer_name}</TableCell>
                  <TableCell className="text-center">{r.pax_count}</TableCell>
                  <TableCell>
                    <Badge variant={
                      r.status === 'dipesan' ? 'default' :
                      r.status === 'hadir' ? 'secondary' :
                      r.status === 'batal' ? 'destructive' : 'outline'
                    }>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === 'dipesan' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(r.id, 'hadir')}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Hadir
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleStatusChange(r.id, 'batal')}>
                            <XCircle className="h-3 w-3 mr-1" /> Batal
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Meja</Label>
              <select
                value={form.table_id}
                onChange={e => setForm({ ...form, table_id: e.target.value })}
                className="mt-1 w-full h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none"
                required
              >
                <option value="">Pilih meja</option>
                {tables.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.area}) · Kap {t.capacity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nama Pemesan</Label>
              <Input
                value={form.customer_name}
                onChange={e => setForm({ ...form, customer_name: e.target.value })}
                required
                placeholder="Budi Santoso"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jumlah Pax</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.pax_count}
                  onChange={e => setForm({ ...form, pax_count: Number(e.target.value) || 1 })}
                  required
                />
              </div>
              <div>
                <Label>Tanggal & Jam</Label>
                <Input
                  type="datetime-local"
                  value={form.booking_time}
                  onChange={e => setForm({ ...form, booking_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Alergi, preferensi, dll"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan Booking</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper function (akan dipindah ke actions.ts nanti)
async function getAvailableTables() {
  const res = await fetch('/api/dashboard/tables/available')
  if (res.ok) return res.json()
  return []
}