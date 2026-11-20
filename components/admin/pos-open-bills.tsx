'use client'

import { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Card } from '../ui/card'
import { formatRupiah } from '../../lib/format'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import {
  rpcApproveOpenBill, rpcApplyDiscount, rpcVoidOrder, rpcSettleOrder, rpcAppendItems,
  getAdminUsers,
} from '../../app/dashboard/(dashboard)/pos/actions'

interface OrderItem {
  id: string
  menu_name: string
  price: number
  qty: number
  notes?: string
  modifiers: { group_name: string; option_name: string; price_delta: number }[]
}

interface OpenBillOrder {
  id: string
  order_code: string
  short_number: number
  customer_name: string
  total: number
  open_bill_status: 'pending_approval' | 'approved'
  payment_status: string
  created_at: string
  discount_amount?: number
  order_items: OrderItem[]
  tables?: { name: string } | null
}

interface PosOpenBillsProps {
  bills: OpenBillOrder[]
  hasOpenShift: boolean
  onChanged: () => void
}

type PinDialogState = {
  kind: 'discount' | 'void'
  order: OpenBillOrder
} | null

export function PosOpenBills({ bills, hasOpenShift, onChanged }: PosOpenBillsProps) {
  const [pinDialog, setPinDialog] = useState<PinDialogState>(null)
  const [settleOrder, setSettleOrder] = useState<OpenBillOrder | null>(null)
  const [appendOrder, setAppendOrder] = useState<OpenBillOrder | null>(null)
  const [loading, setLoading] = useState(false)

  const pending = bills.filter((b) => b.open_bill_status === 'pending_approval')
  const approved = bills.filter((b) => b.open_bill_status === 'approved')

  async function handleApprove(order: OpenBillOrder) {
    setLoading(true)
    try {
      await rpcApproveOpenBill(order.id)
      toast.success(`Open bill ${order.order_code} disetujui`)
      onChanged()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyetujui')
    } finally {
      setLoading(false)
    }
  }

  async function handleSettle(method: string, cashReceived: number | null) {
    if (!settleOrder) return
    setLoading(true)
    try {
      const res = await rpcSettleOrder(settleOrder.id, method, cashReceived)
      toast.success(`Tagihan lunas. Kembalian ${formatRupiah(res.change || 0)}`)
      setSettleOrder(null)
      onChanged()
    } catch (e: any) {
      toast.error(e.message || 'Gagal melunasi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pending Approval */}
      {pending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            Pengajuan Open Bill <Badge variant="destructive">{pending.length}</Badge>
          </h3>
          <div className="space-y-2">
            {pending.map((o) => (
              <Card key={o.id} className="border-destructive/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{o.order_code}</p>
                    <p className="text-sm text-muted-foreground">{o.customer_name || '-'} {o.tables ? `· Meja ${o.tables.name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">#{String(o.short_number).padStart(3, '0')} · {new Date(o.created_at).toLocaleTimeString()}</p>
                  </div>
                  <p className="font-bold">{formatRupiah(o.total)}</p>
                </div>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => handleApprove(o)}
                  disabled={loading}
                >
                  Setujui Open Bill
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Approved Open Bills */}
      <section>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          Open Bill Aktif <Badge variant="secondary">{approved.length}</Badge>
        </h3>
        {approved.length === 0 ? (
          <p className="rounded-[var(--radius-sm)] border border-dashed p-4 text-center text-sm text-muted-foreground">
            Tidak ada open bill aktif
          </p>
        ) : (
          <div className="space-y-2">
            {approved.map((o) => (
              <Card key={o.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{o.order_code} <span className="text-xs text-muted-foreground">#{String(o.short_number).padStart(3, '0')}</span></p>
                    <p className="text-sm text-muted-foreground">{o.customer_name || '-'} {o.tables ? `· Meja ${o.tables.name}` : ''}</p>
                  </div>
                  <p className="font-bold">{formatRupiah(o.total)}</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setAppendOrder(o)} disabled={loading}>Tambah Item</Button>
                  <Button size="sm" variant="outline" onClick={() => setPinDialog({ kind: 'discount', order: o })} disabled={loading}>Diskon</Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => setPinDialog({ kind: 'void', order: o })} disabled={loading}>Void</Button>
                  <Button size="sm" onClick={() => setSettleOrder(o)} disabled={loading || !hasOpenShift}>Tutup & Lunasi</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {pinDialog && (
        <PinActionDialog
          state={pinDialog}
          onClose={() => setPinDialog(null)}
          onDone={onChanged}
        />
      )}

      {settleOrder && (
        <SettleDialog
          order={settleOrder}
          onClose={() => setSettleOrder(null)}
          onConfirm={handleSettle}
          onRefresh={onChanged}
          loading={loading}
        />
      )}

      {appendOrder && (
        <AppendItemsDialog
          order={appendOrder}
          onClose={() => setAppendOrder(null)}
          onDone={onChanged}
        />
      )}
    </div>
  )
}

// ============================================================
// PIN Dialog (Discount / Void)
// ============================================================
function PinActionDialog({ state, onClose, onDone }: {
  state: NonNullable<PinDialogState>
  onClose: () => void
  onDone: () => void
}) {
  const [adminId, setAdminId] = useState('')
  const [pin, setPin] = useState('')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadAdmins() {
    if (loaded) return
    try {
      setAdmins(await getAdminUsers())
      setLoaded(true)
    } catch {
      toast.error('Gagal memuat admin')
    }
  }
  if (!loaded) loadAdmins()

  async function submit() {
    if (!adminId) { toast.error('Pilih admin'); return }
    if (pin.length !== 6) { toast.error('PIN harus 6 digit'); return }
    if (!reason.trim()) { toast.error('Alasan wajib diisi'); return }
    if (state.kind === 'discount') {
      const amt = Number(amount)
      if (!amt || amt <= 0) { toast.error('Nominal diskon tidak valid'); return }
    }

    setLoading(true)
    try {
      if (state.kind === 'discount') {
        await rpcApplyDiscount(state.order.id, Number(amount), reason.trim(), adminId, pin)
        toast.success('Diskon diterapkan')
      } else {
        await rpcVoidOrder(state.order.id, reason.trim(), adminId, pin)
        toast.success('Order di-void')
      }
      onClose()
      onDone()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const isVoid = state.kind === 'void'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isVoid ? 'Ajukan / Proses Void' : 'Terapkan Diskon'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {state.order.order_code} · {formatRupiah(state.order.total)}
          </p>
          {!isVoid && (
            <div>
              <Label>Nominal Diskon (Rp)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="mt-1" />
            </div>
          )}
          <div>
            <Label>Alasan *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isVoid ? 'Alasan void' : 'Alasan diskon'} className="mt-1" />
          </div>
          <div>
            <Label>Admin (PIN)</Label>
            <select value={adminId} onChange={(e) => setAdminId(e.target.value)} className="mt-1 h-8 w-full rounded-[var(--radius-sm)] border border-input bg-transparent px-2 text-sm outline-none">
              <option value="">Pilih admin</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div>
            <Label>PIN 6 Digit</Label>
            <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Memproses...' : isVoid ? 'Proses Void' : 'Terapkan Diskon'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Settle (Lunasi Tagihan) Dialog
// ============================================================
function SettleDialog({ order, onClose, onConfirm, onRefresh, loading }: {
  order: OpenBillOrder
  onClose: () => void
  onConfirm: (method: string, cashReceived: number | null) => void
  onRefresh: () => void
  loading: boolean
}) {
  const [method, setMethod] = useState<'cash' | 'qris_xendit'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [qrLoading, setQrLoading] = useState(false)

  const cashNum = Number(cashReceived) || 0
  const change = method === 'cash' ? cashNum - order.total : 0

  // Countdown
  useEffect(() => {
    if (!qrExpiresAt) { setCountdown(0); return }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(qrExpiresAt).getTime() - Date.now()) / 1000))
      setCountdown(diff)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [qrExpiresAt])

  // Polling status; jika lunas, cukup refresh daftar — JANGAN panggil onConfirm.
  useEffect(() => {
    if (!qrPaymentId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/${qrPaymentId}/qr-check`)
        const data = await res.json()
        if (res.ok && data.status === 'paid') {
          toast.success('Pembayaran QRIS berhasil!')
          onClose()
          onRefresh()
        } else if (res.ok && data.status === 'expired') {
          toast.error('QRIS kedaluwarsa. Buat ulang.')
          setQrCode(null); setQrPaymentId(null)
        }
      } catch { /* retry pada tick berikutnya */ }
    }
    const t = setInterval(poll, 3000)
    return () => clearInterval(t)
  }, [qrPaymentId, onClose, onRefresh])

  async function createQr() {
    setQrLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/qr`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat QRIS')
      const QRCodeLib = (await import('qrcode')).default
      setQrCode(await QRCodeLib.toDataURL(data.qr_string, { width: 240, margin: 1 }))
      setQrExpiresAt(data.expires_at)
      setQrPaymentId(data.payment_id || null)
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat QRIS. Sarankan Tunai.')
    } finally {
      setQrLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tutup & Lunasi Tagihan</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{order.order_code} · {order.customer_name}</p>

          {qrCode ? (
            <div className="flex flex-col items-center gap-3">
              <img src={qrCode} alt="QRIS" className="h-60 w-60 rounded-[var(--radius-sm)] border" />
              <div className="text-center">
                <p className="type-display type-money text-[24px] text-ink">{formatRupiah(order.total)}</p>
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">Berlaku {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</p>
                ) : (
                  <p className="text-sm text-destructive">QRIS kedaluwarsa</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => { setQrCode(null); setQrPaymentId(null); createQr() }} disabled={qrLoading}>
                Buat ulang QR
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label>Metode</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {([['cash', 'Tunai'], ['qris_xendit', 'QRIS']] as const).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => setMethod(v)} className={cn('rounded-[var(--radius-sm)] border px-3 py-2 text-sm', method === v ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {method === 'cash' && (
                <div>
                  <Label>Uang Diterima</Label>
                  <Input type="number" value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} className="mt-1" />
                  <div className={cn('mt-2 flex justify-between rounded-[var(--radius-sm)] px-3 py-2', change >= 0 ? 'bg-muted/50' : 'bg-destructive/10 text-destructive')}>
                    <span className="text-sm">Kembalian</span>
                    <span className="font-bold">{formatRupiah(Math.max(change, 0))}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between rounded-[var(--radius-sm)] bg-muted/50 px-3 py-2">
                <span className="text-sm">Total Tagihan</span>
                <span className="font-bold">{formatRupiah(order.total)}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          {!qrCode && (
            method === 'qris_xendit' ? (
              <Button onClick={createQr} disabled={qrLoading}>
                {qrLoading ? 'Membuat QR...' : 'Tampilkan QRIS'}
              </Button>
            ) : (
              <Button onClick={() => onConfirm('cash', cashNum)} disabled={loading || change < 0}>
                {loading ? 'Memproses...' : 'Konfirmasi Lunas'}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Append Items Dialog (Tambah Item ke Open Bill)
// ============================================================
function AppendItemsDialog({ order, onClose, onDone }: {
  order: OpenBillOrder
  onClose: () => void
  onDone: () => void
}) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Simple inline add: pilih menu & qty tanpa modifier (functional skeleton)
  const [qty, setQty] = useState(1)
  const [selectedMenu, setSelectedMenu] = useState('')
  const [menus, setMenus] = useState<any[]>([])

  async function loadMenus() {
    const res = await fetch('/api/pos/catalog')
    if (res.ok) {
      const data = await res.json()
      setMenus(data.menus)
    }
  }
  if (menus.length === 0) loadMenus()

  async function submit() {
    if (!selectedMenu) { toast.error('Pilih menu'); return }
    setLoading(true)
    try {
      await rpcAppendItems(order.id, [{ menu_id: selectedMenu, bundle_id: null, qty, notes: null, option_ids: null }])
      toast.success('Item ditambahkan ke open bill')
      onClose()
      onDone()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menambah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Item — {order.order_code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Menu</Label>
            <select value={selectedMenu} onChange={(e) => setSelectedMenu(e.target.value)} className="mt-1 h-8 w-full rounded-[var(--radius-sm)] border border-input bg-transparent px-2 text-sm outline-none">
              <option value="">Pilih menu</option>
              {menus.filter((m) => m.name.toLowerCase().includes(search.toLowerCase())).map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {formatRupiah(m.price)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Jumlah</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={submit} disabled={loading}>{loading ? 'Menambah...' : 'Tambah Item'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
