'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Minus, Plus, Trash2, ShoppingCart, QrCode, RefreshCw, Loader2 } from 'lucide-react'
import { formatRupiah } from '../../lib/format'
import { usePosCart, cartSubtotal, cartToRpcItems, type PosCartItem } from '../../lib/pos-store'
import { rpcCreatePosOrder } from '../../app/dashboard/(dashboard)/pos/actions'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import QRCode from 'qrcode'

interface PosCartProps {
  tables: { id: string; name: string }[]
  hasOpenShift: boolean
  onOrderCreated: () => void
  onOpenBillSaved: () => void
}

export function PosCart({ tables, hasOpenShift, onOrderCreated, onOpenBillSaved }: PosCartProps) {
  const {
    items, customerName, tableId, servingMethod,
    updateQty, removeItem, clear, setCustomerName, setTableId, setServingMethod,
  } = usePosCart()

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [action, setAction] = useState<'bayar' | 'open_bill'>('bayar')
  const [method, setMethod] = useState<'cash' | 'qris_xendit'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrPaymentId, setQrPaymentId] = useState<string | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const subtotal = cartSubtotal(items)
  const cashNum = Number(cashReceived) || 0
  const change = method === 'cash' ? cashNum - subtotal : 0

  // Countdown timer untuk QR
  useEffect(() => {
    if (!qrExpiresAt) {
      setCountdown(0)
      if (countdownRef.current) clearInterval(countdownRef.current)
      return
    }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(qrExpiresAt).getTime() - Date.now()) / 1000))
      setCountdown(diff)
      if (diff === 0 && countdownRef.current) clearInterval(countdownRef.current)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [qrExpiresAt])

  // Polling status QR tiap 3 detik
  useEffect(() => {
    if (!qrPaymentId || !qrCode) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }
    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/${qrPaymentId}/qr-check`)
        const data = await res.json()
        if (res.ok && data.status === 'paid') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          toast.success('Pembayaran QRIS berhasil!')
          setQrCode(null)
          setQrPaymentId(null)
          setCheckoutOpen(false)
          clear()
          onOrderCreated()
        } else if (res.ok && data.status === 'expired') {
          if (pollingRef.current) clearInterval(pollingRef.current)
          toast.error('QRIS kedaluwarsa. Silakan buat ulang.')
          setQrCode(null)
          setQrPaymentId(null)
        }
      } catch {
        // diamkan, coba lagi di tick berikutnya
      }
    }
    pollingRef.current = setInterval(poll, 3000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [qrPaymentId, qrCode, clear, onOrderCreated])

  function openCheckout(a: 'bayar' | 'open_bill') {
    if (items.length === 0) {
      toast.error('Keranjang kosong')
      return
    }
    if (!customerName.trim()) {
      toast.error('Nama pelanggan wajib diisi')
      return
    }
    if (a === 'bayar' && !hasOpenShift) {
      toast.error('Buka shift terlebih dahulu untuk menerima pembayaran')
      return
    }
    setAction(a)
    setMethod('cash')
    setQrCode(null)
    setQrPaymentId(null)
    setCheckoutOpen(true)
  }

  async function handleCheckout() {
    if (action === 'bayar' && method === 'qris_xendit') {
      await createQrForOrder()
      return
    }
    setLoading(true)
    try {
      const res = await rpcCreatePosOrder({
        p_table_id: tableId,
        p_customer_name: customerName.trim(),
        p_notes: null,
        p_items: cartToRpcItems(items),
        p_payment_mode: action === 'bayar' ? 'bayar_sekarang' : 'open_bill',
        p_serving_method: servingMethod,
        p_settle_now: action === 'bayar',
        p_method: action === 'bayar' ? method : null,
        p_cash_received: action === 'bayar' && method === 'cash' ? cashNum : null,
      })

      toast.success(action === 'bayar'
        ? `Order ${res.order_code} lunas. Kembalian ${formatRupiah(res.change_amount || 0)}`
        : `Open bill ${res.order_code} disimpan (#${String(res.short_number).padStart(3, '0')})`)

      setCheckoutOpen(false)
      clear()
      action === 'bayar' ? onOrderCreated() : onOpenBillSaved()
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat order')
    } finally {
      setLoading(false)
    }
  }

  // Buat order tanpa settle, lalu minta QRIS
  async function createQrForOrder() {
    setQrLoading(true)
    try {
      // 1. Buat order (tanpa settle)
      const order = await rpcCreatePosOrder({
        p_table_id: tableId,
        p_customer_name: customerName.trim(),
        p_notes: null,
        p_items: cartToRpcItems(items),
        p_payment_mode: 'bayar_sekarang',
        p_serving_method: servingMethod,
        p_settle_now: false,
        p_method: null,
        p_cash_received: null,
      })

      // 2. Minta QR ke server
      const res = await fetch(`/api/orders/${order.order_id}/qr`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat QRIS')

      const qrImg = await QRCode.toDataURL(data.qr_string, { width: 240, margin: 1 })
      setQrCode(qrImg)
      setQrExpiresAt(data.expires_at)
      setQrPaymentId(data.payment_id || null)
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat QRIS. Coba Tunai.')
    } finally {
      setQrLoading(false)
    }
  }

  async function regenerateQr() {
    // Nonaktifkan QR lama (tandai expired) lalu buat baru
    if (qrPaymentId) {
      await fetch(`/api/payments/${qrPaymentId}/qr-check`).catch(() => {})
    }
    setQrCode(null)
    setQrPaymentId(null)
    await createQrForOrder()
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="type-title flex items-center gap-2 text-[16px] text-ink">
          <ShoppingCart className="h-5 w-5" /> Keranjang
        </h2>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>Kosongkan</Button>
        )}
      </div>

      <Card className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Klik menu untuk menambah
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <CartLine key={item.lineId} item={item} onQty={updateQty} onRemove={removeItem} />
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <div>
          <Label className="text-[13px]">Nama pelanggan</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan"
            className="mt-1 h-11 text-[15px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[13px]">Meja (opsional)</Label>
            <select
              value={tableId || ''}
              onChange={(e) => setTableId(e.target.value || null)}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[14px] outline-none focus-visible:border-[var(--brand-500)]"
            >
              <option value="">Walk-in</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-[13px]">Penyajian</Label>
            <select
              value={servingMethod}
              onChange={(e) => setServingMethod(e.target.value)}
              className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[14px] outline-none focus-visible:border-[var(--brand-500)]"
            >
              <option value="ambil_sendiri">Ambil Sendiri</option>
              <option value="antar_meja">Antar Meja</option>
              <option value="antar_gedung">Antar Gedung</option>
            </select>
          </div>
        </div>

        <div className="flex items-end justify-between rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-3 py-2.5">
          <div>
            <p className="type-label text-[12px] text-ink-muted">Total tagihan</p>
            <p className="type-label mt-0.5 text-[12px] text-ink-faint">{items.length} baris · {items.reduce((n, i) => n + i.qty, 0)} item</p>
          </div>
          <span className="type-display type-money text-[28px] leading-none text-ink">
            {formatRupiah(subtotal)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12 rounded-[var(--radius-sm)] text-[14px] font-semibold"
            onClick={() => openCheckout('open_bill')}
            disabled={loading}
          >
            Simpan open bill
          </Button>
          <Button
            className="h-12 rounded-[var(--radius-sm)] text-[14px] font-semibold"
            onClick={() => openCheckout('bayar')}
            disabled={loading}
          >
            Bayar sekarang
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{action === 'bayar' ? 'Bayar Sekarang' : 'Simpan Open Bill'}</DialogTitle>
          </DialogHeader>

          {action === 'bayar' ? (
            <div className="space-y-3">
              {qrCode ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={qrCode} alt="QRIS" className="h-60 w-60 rounded-[var(--radius-sm)] border" />
                  <div className="text-center">
                    <p className="type-display type-money text-[24px] text-ink">{formatRupiah(subtotal)}</p>
                    {countdown > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Berlaku {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                      </p>
                    ) : (
                      <p className="text-sm text-destructive">QRIS kedaluwarsa</p>
                    )}
                    <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Menunggu pembayaran...
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={regenerateQr} disabled={qrLoading}>
                      <RefreshCw className={cn('mr-1 h-3 w-3', qrLoading && 'animate-spin')} />
                      Buat ulang QR
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setQrCode(null); setQrPaymentId(null) }}>
                      Ganti metode
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Metode Pembayaran</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {([
                        ['cash', 'Tunai'],
                        ['qris_xendit', 'QRIS'],
                      ] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setMethod(val)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors',
                            method === val ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          )}
                        >
                          {val === 'qris_xendit' && <QrCode className="h-4 w-4" />}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {method === 'cash' && (
                    <div>
                      <Label>Uang Diterima</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder={String(subtotal)}
                        className="mt-1"
                      />
                      <div className={cn('mt-2 flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2', change >= 0 ? 'bg-muted/50' : 'bg-destructive/10 text-destructive')}>
                        <span className="text-sm">Kembalian</span>
                        <span className="type-money text-[16px] font-bold">{formatRupiah(Math.max(change, 0))}</span>
                      </div>
                      {change < 0 && <p className="mt-1 text-xs text-destructive">Uang kurang {formatRupiah(-change)}</p>}
                    </div>
                  )}

                  <div className="flex justify-between rounded-[var(--radius-sm)] bg-muted/50 px-3 py-2">
                    <span className="text-sm">Total</span>
                    <span className="type-money text-[16px] font-bold">{formatRupiah(subtotal)}</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Open bill akan langsung masuk antrean dapur dengan status <b>Belum Dibayar</b>. Pembayaran dilakukan saat pelanggan selesai.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Batal</Button>
            {!qrCode && (
              <Button
                onClick={handleCheckout}
                disabled={loading || qrLoading || (action === 'bayar' && method === 'cash' && change < 0)}
              >
                {qrLoading ? (
                  <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Membuat QR...</>
                ) : (
                  action === 'bayar' ? 'Konfirmasi Pembayaran' : 'Simpan Open Bill'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CartLine({ item, onQty, onRemove }: {
  item: PosCartItem
  onQty: (lineId: string, qty: number) => void
  onRemove: (lineId: string) => void
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--line)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{item.name}</p>
          {item.modifiers.length > 0 && (
            <p className="truncate text-[12px] text-ink-muted">
              {item.modifiers.map((m) => m.option_name).join(', ')}
            </p>
          )}
          {item.notes && <p className="truncate text-[12px] italic text-ink-faint">{item.notes}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 text-[var(--danger)]"
          onClick={() => onRemove(item.lineId)}
          aria-label="Hapus"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="type-money text-[13px] text-ink-muted">{formatRupiah(item.unitPrice)}</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => onQty(item.lineId, item.qty - 1)}
            aria-label="Kurangi"
          >
            <Minus className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <span className="w-7 text-center text-[15px] font-semibold tabular-nums">{item.qty}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11"
            onClick={() => onQty(item.lineId, item.qty + 1)}
            aria-label="Tambah"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
      <p className="type-money mt-1 text-right text-[13px] font-semibold text-ink">
        {formatRupiah(item.unitPrice * item.qty)}
      </p>
    </div>
  )
}
