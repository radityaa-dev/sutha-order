'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireFeature } from '@/lib/auth'

const JAKARTA = 'Asia/Jakarta'

function todayBounds() {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const start = new Date(`${dateStr}T00:00:00+07:00`)
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() }
}

export interface ActiveShiftRow {
  shift_id: string
  cashier: string
  opened_at: string
  opening_cash: number
  txn_count: number
  total_cash: number
  total_qris: number
}

/** Monitor Kasir (read-only): shift aktif + rekap hari ini. */
export async function getCashierMonitor() {
  await requireFeature('shiftHistory', 'view')

  // Shift yang masih terbuka
  const { data: openShifts, error: shiftErr } = await adminClient
    .from('shifts')
    .select('id, opened_at, opening_cash, user_id')
    .eq('status', 'open')
    .order('opened_at', { ascending: true })
  if (shiftErr) throw shiftErr

  const shiftIds = (openShifts || []).map((s: any) => s.id)
  const userIds = (openShifts || []).map((s: any) => s.user_id)

  // Nama kasir
  const { data: profiles } = userIds.length
    ? await adminClient.from('user_profiles').select('id, full_name').in('id', userIds)
    : { data: [] as any[] }
  const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))

  // Payment per shift
  const { data: payments } = shiftIds.length
    ? await adminClient
        .from('payments')
        .select('shift_id, amount, method, status')
        .in('shift_id', shiftIds)
        .eq('status', 'paid')
    : { data: [] as any[] }

  const rows: ActiveShiftRow[] = (openShifts || []).map((s: any) => {
    const ps = (payments || []).filter((p: any) => p.shift_id === s.id)
    const cash = ps.filter((p: any) => p.method === 'cash').reduce((a: number, p: any) => a + Number(p.amount || 0), 0)
    const qris = ps
      .filter((p: any) => p.method !== 'cash')
      .reduce((a: number, p: any) => a + Number(p.amount || 0), 0)
    return {
      shift_id: s.id,
      cashier: nameById.get(s.user_id) || '-',
      opened_at: s.opened_at,
      opening_cash: Number(s.opening_cash || 0),
      txn_count: ps.length,
      total_cash: cash,
      total_qris: qris,
    }
  })

  // Ringkasan hari ini seluruh kasir
  const { start, end } = todayBounds()
  const { data: todayPayments } = await adminClient
    .from('payments')
    .select('amount, method, status')
    .eq('status', 'paid')
    .gte('paid_at', start)
    .lt('paid_at', end)

  const t = todayPayments || []
  const todayCash = t.filter((p: any) => p.method === 'cash').reduce((a: number, p: any) => a + Number(p.amount || 0), 0)
  const todayQris = t.filter((p: any) => p.method !== 'cash').reduce((a: number, p: any) => a + Number(p.amount || 0), 0)

  // Order menunggu konfirmasi open bill
  const { count: pendingApproval } = await adminClient
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('open_bill_status', 'pending_approval')

  return {
    shifts: rows,
    today: {
      txn: t.length,
      cash: todayCash,
      qris: todayQris,
      pendingApproval: pendingApproval || 0,
    },
  }
}

export interface ShiftHistoryRow {
  id: string
  cashier: string
  opened_at: string
  closed_at: string | null
  opening_cash: number
  total_cash: number
  total_non_cash: number
  counted_cash: number | null
  cash_difference: number | null
  reviewed_at: string | null
  status: string
}

/** Riwayat shift semua kasir (admin=P, stakeholder=L). */
export async function getShiftHistory(): Promise<ShiftHistoryRow[]> {
  await requireFeature('shiftHistory', 'view')

  const { data, error } = await adminClient
    .from('shifts')
    .select('id, user_id, opened_at, closed_at, opening_cash, total_cash, total_non_cash, counted_cash, cash_difference, reviewed_at, status')
    .order('opened_at', { ascending: false })
    .limit(100)
  if (error) throw error

  const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id)))
  const { data: profiles } = userIds.length
    ? await adminClient.from('user_profiles').select('id, full_name').in('id', userIds)
    : { data: [] as any[] }
  const nameById = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))

  return (data || []).map((s: any) => ({
    id: s.id,
    cashier: nameById.get(s.user_id) || '-',
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    opening_cash: Number(s.opening_cash || 0),
    total_cash: Number(s.total_cash || 0),
    total_non_cash: Number(s.total_non_cash || 0),
    counted_cash: s.counted_cash === null ? null : Number(s.counted_cash),
    cash_difference: s.cash_difference === null ? null : Number(s.cash_difference),
    reviewed_at: s.reviewed_at,
    status: s.status,
  }))
}

/** Tandai selisih kas shift sudah ditinjau (admin). */
export async function markShiftReviewed(shiftId: string) {
  const user = await requireFeature('shiftHistory', 'full')
  const { error } = await adminClient
    .from('shifts')
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', shiftId)
  if (error) throw new Error(error.message)
}