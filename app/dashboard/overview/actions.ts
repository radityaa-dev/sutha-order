'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireFeature } from '@/lib/auth'

export interface ActionItem {
  label: string
  count: number
  href: string
  tone: 'danger' | 'warning' | 'info'
  detail: string
}

/**
 * Panel "Perlu Tindakan" untuk admin:
 * - void/diskon menunggu persetujuan
 * - order refund_pending
 * - order bermasalah (amount_mismatch / cancelled berbayar)
 * - shift dengan selisih kas belum ditinjau
 */
export async function getNeedsAttention(): Promise<ActionItem[]> {
  await requireFeature('approval', 'full')

  const items: ActionItem[] = []

  // 1. Void pending approval
  const { count: voidPending } = await adminClient
    .from('void_logs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (voidPending && voidPending > 0) {
    items.push({
      label: 'Void menunggu persetujuan',
      count: voidPending,
      href: '/dashboard/logs',
      tone: 'danger',
      detail: 'Perlu PIN admin',
    })
  }

  // 2. Payment refund_pending
  const { count: refundPending } = await adminClient
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'refund_pending')
  if (refundPending && refundPending > 0) {
    items.push({
      label: 'Pembayaran perlu refund',
      count: refundPending,
      href: '/admin/orders',
      tone: 'danger',
      detail: 'QRIS masuk setelah kedaluwarsa',
    })
  }

  // 3. Payment amount mismatch
  const { count: mismatch } = await adminClient
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'amount_mismatch')
  if (mismatch && mismatch > 0) {
    items.push({
      label: 'Nominal tidak cocok',
      count: mismatch,
      href: '/admin/orders',
      tone: 'warning',
      detail: 'Periksa transaksi',
    })
  }

  // 4. Shift tertutup dengan selisih kas belum ditinjau
  const { count: shiftDiff } = await adminClient
    .from('shifts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'closed')
    .neq('cash_difference', 0)
    .is('reviewed_at', null)
  if (shiftDiff && shiftDiff > 0) {
    items.push({
      label: 'Selisih kas belum ditinjau',
      count: shiftDiff,
      href: '/dashboard/shifts/history',
      tone: 'warning',
      detail: 'Riwayat shift kasir',
    })
  }

  return items
}