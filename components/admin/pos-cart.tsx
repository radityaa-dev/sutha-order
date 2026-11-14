'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { formatRupiah } from '../../lib/format'
import { usePosCart, cartSubtotal, cartToRpcItems, type PosCartItem } from '../../lib/pos-store'
import { rpcCreatePosOrder } from '../../app/dashboard/(dashboard)/pos/actions'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

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
  const [method, setMethod] = useState<'cash' | 'qris_manual' | 'transfer' | 'edc_card'>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = cartSubtotal(items)
  const cashNum = Number(cashReceived) || 0
  const change = method === 'cash' ? cashNum - subtotal : 0

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
    setCheckoutOpen(true)
  }

  async function handleCheckout() {
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

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
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
          <Label>Nama Pelanggan *</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nama pelanggan"
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Meja (opsional)</Label>
            <select
              value={tableId || ''}
              onChange={(e) => setTableId(e.target.value || null)}
              className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">Walk-in</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Penyajian</Label>
            <select
              value={servingMethod}
              onChange={(e) => setServingMethod(e.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="ambil_sendiri">Ambil Sendiri</option>
              <option value="antar_meja">Antar Meja</option>
              <option value="antar_gedung">Antar Gedung</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold">{formatRupiah(subtotal)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => openCheckout('open_bill')} disabled={loading}>
            Simpan Open Bill
          </Button>
          <Button onClick={() => openCheckout('bayar')} disabled={loading}>
            Bayar Sekarang
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
              <div>
                <Label>Metode Pembayaran</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {([
                    ['cash', 'Tunai'],
                    ['qris_manual', 'QRIS Manual'],
                    ['transfer', 'Transfer'],
                    ['edc_card', 'EDC Card'],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setMethod(val)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm transition-colors',
                        method === val ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      )}
                    >
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
                  <div className={cn('mt-2 flex items-center justify-between rounded-lg px-3 py-2', change >= 0 ? 'bg-muted/50' : 'bg-destructive/10 text-destructive')}>
                    <span className="text-sm">Kembalian</span>
                    <span className="text-lg font-bold">{formatRupiah(Math.max(change, 0))}</span>
                  </div>
                  {change < 0 && <p className="mt-1 text-xs text-destructive">Uang kurang {formatRupiah(-change)}</p>}
                </div>
              )}

              <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">Total</span>
                <span className="text-lg font-bold">{formatRupiah(subtotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Open bill akan langsung masuk antrean dapur dengan status <b>Belum Dibayar</b>. Pembayaran dilakukan saat pelanggan selesai.
            </p>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Batal</Button>
            <Button
              onClick={handleCheckout}
              disabled={loading || (action === 'bayar' && method === 'cash' && change < 0)}
            >
              {loading ? 'Memproses...' : action === 'bayar' ? 'Konfirmasi Pembayaran' : 'Simpan Open Bill'}
            </Button>
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
    <div className="rounded-lg border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          {item.modifiers.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {item.modifiers.map((m) => m.option_name).join(', ')}
            </p>
          )}
          {item.notes && <p className="truncate text-xs italic text-muted-foreground">{item.notes}</p>}
        </div>
        <Button variant="ghost" size="icon-xs" onClick={() => onRemove(item.lineId)} aria-label="Hapus">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm">{formatRupiah(item.unitPrice)}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-xs" onClick={() => onQty(item.lineId, item.qty - 1)} aria-label="Kurangi">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
          <Button variant="outline" size="icon-xs" onClick={() => onQty(item.lineId, item.qty + 1)} aria-label="Tambah">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {formatRupiah(item.unitPrice * item.qty)}
      </p>
    </div>
  )
}
