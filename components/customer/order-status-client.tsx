'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRupiah } from '../../lib/format'
import { PayButton } from './pay-button'
import { Order } from '../../lib/types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Home, RefreshCw, Plus, ShoppingCart, Check, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

// Urutan tampilan. `accepted` = pesanan diterima dapur (setelah dibayar / disetujui kasir).
const STEPS = [
  { key: 'accepted', label: 'Diterima' },
  { key: 'preparing', label: 'Diproses' },
  { key: 'ready', label: 'Siap' },
  { key: 'completed', label: 'Selesai' },
] as const

const PAYMENT_LABEL: Record<string, string> = {
  pending: 'Belum dibayar',
  paid: 'Sudah dibayar',
  expired: 'Kedaluwarsa',
  failed: 'Gagal',
}

const OPEN_BILL_LABEL: Record<string, string> = {
  pending_approval: 'Menunggu persetujuan kasir',
  approved: 'Disetujui',
}

export default function OrderStatusClient({ accessToken, initialOrder }: { accessToken: string; initialOrder: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [loading, setLoading] = useState(false)
  const [appendOpen, setAppendOpen] = useState(false)
  const router = useRouter()

  const [menus, setMenus] = useState<any[]>([])
  const [selectedMenu, setSelectedMenu] = useState('')
  const [appendQty, setAppendQty] = useState(1)
  const [appendLoading, setAppendLoading] = useState(false)

  const prevStatus = useRef(order.order_status)
  useEffect(() => {
    if (order.order_status === 'ready' && prevStatus.current !== 'ready') {
      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext
        const ctx = new AudioCtor()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.2, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start()
        osc.stop(ctx.currentTime + 0.5)
      } catch { /* audio tidak tersedia */ }
      try { navigator.vibrate?.([300, 150, 300]) } catch { /* vibrate tidak tersedia */ }
      toast.success('Pesanan siap diambil')
    }
    prevStatus.current = order.order_status
  }, [order.order_status])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${accessToken}`)
        if (!res.ok) return
        setOrder(await res.json())
      } catch { /* coba lagi tick berikutnya */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [accessToken])

  useEffect(() => {
    if (appendOpen && menus.length === 0) {
      fetch('/api/pos/catalog')
        .then((r) => r.json())
        .then((d) => setMenus(d.menus || []))
        .catch(() => toast.error('Gagal memuat menu'))
    }
  }, [appendOpen, menus.length])

  const isPaid = order.payment_status === 'paid'
  const isExpired = order.payment_status === 'expired'
  const canAppend = order.payment_mode === 'open_bill' && order.open_bill_status === 'approved' && !isPaid

  // Posisi langkah: order_status 'pending' dipetakan ke langkah -1 (belum masuk dapur).
  const statusToStep: Record<string, number> = {
    pending: -1,
    accepted: 0,
    preparing: 1,
    ready: 2,
    completed: 3,
  }
  const currentStep = statusToStep[order.order_status] ?? -1

  async function handleRetryPayment() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${accessToken}/pay`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat invoice')
      if (data.invoiceUrl) window.location.href = data.invoiceUrl
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAppend() {
    if (!selectedMenu) return toast.error('Pilih menu')
    setAppendLoading(true)
    try {
      const res = await fetch(`/api/orders/${accessToken}/append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ menuId: selectedMenu, qty: appendQty }] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambah')
      toast.success('Pesanan ditambahkan ke tagihan')
      setAppendOpen(false)
      setSelectedMenu('')
      setAppendQty(1)
      const r = await fetch(`/api/orders/${accessToken}`)
      if (r.ok) setOrder(await r.json())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAppendLoading(false)
    }
  }

  function handleBackToMenu() {
    router.push(`/m/${accessToken}`)
  }

  const isReady = order.order_status === 'ready'
  const needsCashier = order.payment_mode === 'open_bill' && order.open_bill_status === 'pending_approval'

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-background px-4 pb-24 pt-5">
      {/* Nomor pesanan sebagai elemen utama */}
      <header className="border-b border-[var(--line)] pb-4">
        <p className="text-[13px] text-ink-muted">Pesanan Anda</p>
        {order.short_number ? (
          <p className="type-hero type-money mt-1 text-[56px] leading-none text-ink">
            #{String(order.short_number).padStart(3, '0')}
          </p>
        ) : (
          <p className="type-display mt-1 text-[24px] text-ink">{order.order_code}</p>
        )}
        <p className="mt-2 text-[13px] text-ink-muted">
          {order.tables?.name ? `Meja ${order.tables.name}` : 'Tanpa meja'}
          {order.serving_method === 'ambil_sendiri' && ' · Ambil di counter'}
          {order.serving_method === 'antar_meja' && ' · Diantar ke meja'}
          {order.serving_method === 'antar_gedung' && ' · Diantar ke gedung'}
        </p>
      </header>

      {/* Pesanan siap */}
      {isReady && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--success)]/40 bg-[var(--success-soft)] px-4 py-3">
          <Check className="h-5 w-5 shrink-0 text-[var(--success)]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[var(--success)]">Siap diambil</p>
            <p className="text-[13px] text-[var(--success)]/80">
              {order.serving_method === 'ambil_sendiri' ? 'Ambil di counter.' : 'Pesanan sedang diantar.'}
            </p>
          </div>
        </div>
      )}

      {/* Menunggu konfirmasi kasir (open bill) */}
      {needsCashier && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3">
          <p className="text-[15px] font-semibold text-[var(--warning)]">Menunggu persetujuan kasir</p>
          <p className="mt-0.5 text-[13px] text-[var(--warning)]/85">
            Pesanan dibuat dengan bayar di kasir. Tunjukkan nomor ini ke kasir untuk dikonfirmasi.
          </p>
        </div>
      )}

      {/* Belum dibayar */}
      {!isPaid && !isExpired && order.payment_status === 'pending' && order.payment_mode !== 'open_bill' && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <p className="text-[15px] font-semibold text-ink">Belum dibayar</p>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Selesaikan pembayaran agar pesanan masuk dapur.
          </p>
          <div className="mt-3">
            <PayButton orderCode={order.order_code} />
          </div>
        </div>
      )}

      {isExpired && !isPaid && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3">
          <p className="text-[15px] font-semibold text-[var(--danger)]">Waktu pembayaran habis</p>
          <p className="mt-0.5 text-[13px] text-[var(--danger)]/85">
            Pesanan belum masuk dapur. Buat ulang pembayaran untuk melanjutkan.
          </p>
          <Button
            className="mt-3 h-11 w-full rounded-[var(--radius-sm)] text-[14px] font-semibold"
            onClick={handleRetryPayment}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            {loading ? 'Memproses...' : 'Bayar ulang'}
          </Button>
        </div>
      )}

      {/* Langkah pesanan */}
      <section className="mt-5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="type-title text-[15px] text-ink">Progres pesanan</h2>
          <span className="text-[12px] text-ink-muted">
            {currentStep < 0 ? 'Belum masuk dapur' : STEPS[currentStep]?.label}
          </span>
        </div>

        <ol className="mt-3 space-y-2.5">
          {STEPS.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <li key={step.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    done && 'bg-[var(--success-soft)] text-[var(--success)]',
                    active && 'bg-[var(--brand-700)] text-white',
                    !done && !active && 'bg-[var(--surface-sunken)] text-ink-faint'
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-[14px]',
                    active ? 'font-semibold text-ink' : done ? 'text-ink-muted' : 'text-ink-faint'
                  )}
                >
                  {step.label}
                </span>
                {active && <ChevronRight className="ml-auto h-4 w-4 text-[var(--brand-700)]" strokeWidth={1.75} />}
              </li>
            )
          })}
        </ol>
      </section>

      {/* Rincian */}
      <section className="mt-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="type-title mb-2.5 text-[15px] text-ink">Rincian</h2>
        <ul className="space-y-2">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="type-money mr-1.5 text-[14px] font-semibold text-ink-muted">
                  {item.qty}×
                </span>
                <span className="text-[14px] text-ink">{item.menu_name}</span>
                {(item as any).modifiers?.length > 0 && (
                  <span className="block text-[12px] text-ink-muted">
                    {(item as any).modifiers.map((m: any) => m.option_name).join(', ')}
                  </span>
                )}
              </span>
              <span className="type-money shrink-0 text-[14px] text-ink">
                {formatRupiah(item.price * item.qty)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
          <span className="text-[13px] text-ink-muted">Total</span>
          <span className="type-display type-money text-[20px] text-ink">{formatRupiah(order.total)}</span>
        </div>
        <dl className="mt-2.5 space-y-1 border-t border-[var(--line)] pt-2.5 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Pembayaran</dt>
            <dd className={cn(
              'font-medium',
              isPaid && 'text-[var(--success)]',
              isExpired && 'text-[var(--danger)]'
            )}>
              {PAYMENT_LABEL[order.payment_status] ?? order.payment_status}
            </dd>
          </div>
          {order.payment_mode === 'open_bill' && (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Tagihan kasir</dt>
              <dd className="font-medium text-ink">
                {order.open_bill_status
                  ? OPEN_BILL_LABEL[order.open_bill_status] ?? order.open_bill_status
                  : '-'}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Tambah pesanan */}
      {canAppend && (
        <section className="mt-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="type-title text-[15px] text-ink">Tambah pesanan</h2>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Tagihan belum dibayar, jadi item baru langsung ditambahkan.
          </p>

          {!appendOpen ? (
            <Button
              variant="outline"
              className="mt-3 h-11 w-full rounded-[var(--radius-sm)] text-[14px] font-semibold"
              onClick={() => setAppendOpen(true)}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Tambah menu
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <select
                value={selectedMenu}
                onChange={(e) => setSelectedMenu(e.target.value)}
                aria-label="Pilih menu"
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--surface)] px-2.5 text-[14px] text-ink outline-none focus-visible:border-[var(--brand-500)]"
              >
                <option value="">Pilih menu</option>
                {menus.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — {formatRupiah(m.price)}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label="Jumlah"
                  value={appendQty}
                  onChange={(e) => setAppendQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-11 w-20 text-[15px]"
                />
                <Button
                  className="h-11 flex-1 rounded-[var(--radius-sm)] text-[14px] font-semibold"
                  onClick={handleAppend}
                  disabled={appendLoading || !selectedMenu}
                >
                  {appendLoading ? 'Menambah...' : 'Tambah'}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 rounded-[var(--radius-sm)] px-3 text-[14px]"
                  onClick={() => setAppendOpen(false)}
                  disabled={appendLoading}
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mt-5">
        <Button
          variant="outline"
          className="h-11 w-full rounded-[var(--radius-sm)] text-[14px] font-medium"
          onClick={handleBackToMenu}
        >
          <Home className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
          Kembali ke menu
        </Button>
      </div>
    </div>
  )
}