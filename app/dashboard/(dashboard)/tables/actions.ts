'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

async function requireTableUser() {
  return requireRole('admin', 'kasir')
}

export async function getTablesWithOrders() {
  await requireTableUser()

  const { data: tables, error } = await adminClient
    .from('tables')
    .select(`
      *,
      orders!table_id (
        id,
        order_code,
        short_number,
        customer_name,
        total,
        order_status,
        payment_status,
        payment_mode,
        open_bill_status,
        serving_method,
        accepted_at,
        created_at
      )
    `)
    .eq('is_active', true)
    .order('area')
    .order('name')

  if (error) throw error

  // Filter orders: hanya yang belum completed/cancelled/expired
  return tables.map((t: any) => ({
    ...t,
    active_orders: (t.orders || []).filter((o: any) =>
      !['completed', 'cancelled', 'expired'].includes(o.order_status)
    ),
    status: computeTableStatus(t)
  }))
}

function computeTableStatus(table: any): 'kosong' | 'terisi' | 'dipesan' {
  // Gunakan table.orders (data mentah dari Supabase) atau table.active_orders (sudah difilter)
  const orders = table.active_orders ?? (table.orders || [])
  if (orders.length === 0) return 'kosong'
  // Jika ada order dengan payment_status pending (open bill pending approval) -> dipesan
  if (orders.some((o: any) => o.payment_status === 'pending' && o.payment_mode === 'open_bill')) {
    return 'dipesan'
  }
  return 'terisi'
}

export async function getAvailableTables(excludeId?: string) {
  await requireTableUser()

  let query = adminClient
    .from('tables')
    .select('id, name, area, capacity, status')
    .eq('is_active', true)
    .eq('status', 'kosong')

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAvailableTablesPublic() {
  const { data, error } = await adminClient
    .from('tables')
    .select('id, name, area, capacity')
    .eq('is_active', true)
    .eq('status', 'kosong')
    .order('area')
    .order('name')

  if (error) throw error
  return data
}

export async function moveOrderTableAction(orderId: string, newTableId: string) {
  await requireTableUser()

  const { data, error } = await adminClient.rpc('move_order_table', {
    p_order_id: orderId,
    p_new_table_id: newTableId,
    p_created_by: (await requireTableUser()).id
  })

  if (error) throw new Error(error.message)
  return data
}

export async function splitOrderBillAction(sourceOrderId: string, itemIds: string[]) {
  await requireTableUser()

  const { data, error } = await adminClient.rpc('split_order_bill', {
    p_source_order_id: sourceOrderId,
    p_item_ids: itemIds,
    p_created_by: (await requireTableUser()).id
  })

  if (error) throw new Error(error.message)
  return data
}

export async function mergeOrderBillsAction(sourceOrderId: string, targetOrderId: string) {
  await requireTableUser()

  const { data, error } = await adminClient.rpc('merge_order_bills', {
    p_source_order_id: sourceOrderId,
    p_target_order_id: targetOrderId,
    p_created_by: (await requireTableUser()).id
  })

  if (error) throw new Error(error.message)
  return data
}

export async function createReservation(input: {
  table_id: string
  customer_name: string
  pax_count: number
  booking_time: string
  notes?: string
}) {
  await requireTableUser()

  const user = await requireTableUser()

  // Validasi anti-bentrok: cek booking tumpang tindih pada meja yang sama
  const bookingTime = new Date(input.booking_time)
  const windowStart = new Date(bookingTime.getTime() - 2 * 60 * 60 * 1000) // 2 jam sebelum
  const windowEnd = new Date(bookingTime.getTime() + 2 * 60 * 60 * 1000)   // 2 jam sesudah

  const { data: conflicts, error: conflictError } = await adminClient
    .from('reservations')
    .select('id')
    .eq('table_id', input.table_id)
    .neq('status', 'batal')
    .neq('status', 'tidak_hadir')
    .gte('booking_time', windowStart.toISOString())
    .lte('booking_time', windowEnd.toISOString())

  if (conflictError) throw conflictError
  if (conflicts && conflicts.length > 0) {
    throw new Error('Meja sudah dibooking pada jam tersebut')
  }

  const { error } = await adminClient.from('reservations').insert({
    ...input,
    created_by: user.id,
  })

  if (error) throw error
}

export async function getReservations() {
  await requireTableUser()

  const { data, error } = await adminClient
    .from('reservations')
    .select(`
      *,
      tables (id, name, area)
    `)
    .order('booking_time', { ascending: true })

  if (error) throw error
  return data
}

export async function updateReservationStatus(reservationId: string, status: string) {
  await requireTableUser()

  const { error } = await adminClient
    .from('reservations')
    .update({ status })
    .eq('id', reservationId)

  if (error) throw error

  // Jika status 'hadir', update meja jadi terisi
  if (status === 'hadir') {
    const { data: res } = await adminClient
      .from('reservations')
      .select('table_id')
      .eq('id', reservationId)
      .single()

    if (res?.table_id) {
      await adminClient
        .from('tables')
        .update({ status: 'terisi' })
        .eq('id', res.table_id)
    }
  }
}

export async function deleteReservation(reservationId: string) {
  await requireTableUser()

  const { error } = await adminClient
    .from('reservations')
    .delete()
    .eq('id', reservationId)

  if (error) throw error
}

// Auto-release booking > 30 menit lewat tanpa 'hadir'
export async function releaseExpiredReservations() {
  await requireRole('admin')

  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: expired, error: fetchError } = await adminClient
    .from('reservations')
    .select('id, table_id')
    .eq('status', 'dipesan')
    .lt('booking_time', cutoff)

  if (fetchError) throw fetchError

  for (const r of expired || []) {
    await adminClient
      .from('reservations')
      .update({ status: 'tidak_hadir' })
      .eq('id', r.id)

    // Reset meja status jika tidak ada order aktif
    const { data: activeOrders } = await adminClient
      .from('orders')
      .select('id')
      .eq('table_id', r.table_id)
      .neq('payment_status', 'paid')
      .not('order_status', 'in', ['completed', 'cancelled', 'expired'])
      .limit(1)

    if (!activeOrders || activeOrders.length === 0) {
      await adminClient
        .from('tables')
        .update({ status: 'kosong' })
        .eq('id', r.table_id)
    }
  }

  return { released: expired?.length || 0 }
}