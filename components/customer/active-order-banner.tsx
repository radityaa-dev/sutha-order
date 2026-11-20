import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { formatRupiah } from '../../lib/format'

export interface ActiveOrder {
  orderCode: string
  shortNumber: number | null
  status: string
  paymentStatus: string
  paymentMode: string
  openBillStatus: string | null
  total: number
  createdAt: string
  token: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  paid: 'Dibayar',
  accepted: 'Diterima',
  preparing: 'Sedang dibuat',
  ready: 'Siap diambil',
  completed: 'Selesai',
}

/**
 * Ringkasan pesanan aktif pelanggan pada meja ini.
 * Tujuannya: setelah menutup tab status, pelanggan tetap tahu pesanannya
 * masih berjalan dan bisa kembali ke halaman status.
 */
export function ActiveOrderBanner({ order }: { order: ActiveOrder }) {
  const isReady = order.status === 'ready'
  const needsApproval =
    order.paymentMode === 'open_bill' && order.openBillStatus === 'pending_approval'
  const unpaid = order.paymentStatus !== 'paid'

  const label = needsApproval
    ? 'Menunggu konfirmasi kasir'
    : STATUS_LABEL[order.status] ?? order.status

  return (
    <Link
      href={`/order/${order.token}`}
      prefetch={false}
      className={
        'flex min-h-[52px] items-center gap-3 rounded-[var(--radius-sm)] border px-3 py-2 transition-colors ' +
        (isReady
          ? 'border-[var(--success)]/40 bg-[var(--success-soft)]'
          : 'border-[var(--line)] bg-[var(--surface)]')
      }
    >
      <span
        className={
          'type-money text-[17px] font-semibold leading-none ' +
          (isReady ? 'text-[var(--success)]' : 'text-ink')
        }
      >
        {order.shortNumber ? `#${String(order.shortNumber).padStart(3, '0')}` : order.orderCode}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={
            'block text-[13px] font-medium ' +
            (isReady ? 'text-[var(--success)]' : 'text-ink')
          }
        >
          {label}
        </span>
        <span className="block text-[12px] text-ink-muted">
          {unpaid ? 'Belum dibayar' : 'Sudah dibayar'} · {formatRupiah(order.total)}
        </span>
      </span>
      <ChevronRight
        className={'h-4 w-4 shrink-0 ' + (isReady ? 'text-[var(--success)]' : 'text-ink-faint')}
        strokeWidth={1.75}
      />
    </Link>
  )
}