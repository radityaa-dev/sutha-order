'use server'

import { adminClient } from '../../../lib/supabase/admin'

export async function getTableByToken(token: string) {
  const { data, error } = await adminClient
    .from('tables')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

/**
 * Pesanan aktif pada meja ini yang masih bisa dilihat pelanggan.
 * Dipakai header menu QR supaya pelanggan tidak kehilangan jejak pesanan
 * setelah menutup tab status.
 */
export async function getActiveOrdersForTable(tableId: string) {
  const { data, error } = await adminClient
    .from('orders')
    .select('order_code, short_number, order_status, payment_status, payment_mode, open_bill_status, total, created_at, access_token')
    .eq('table_id', tableId)
    .not('order_status', 'in', '(completed,cancelled,expired)')
    .neq('payment_status', 'expired')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching active orders:', error)
    return []
  }

  return (data || []).map((o: any) => ({
    orderCode: o.order_code,
    shortNumber: o.short_number,
    // access_token TIDAK dikirim ke klien; tautan dibuat di server.
    status: o.order_status,
    paymentStatus: o.payment_status,
    paymentMode: o.payment_mode,
    openBillStatus: o.open_bill_status,
    total: Number(o.total || 0),
    createdAt: o.created_at,
    token: o.access_token,
  }))
}

export async function getPublishedMenus() {
  const { data, error } = await adminClient
    .from('menus')
    .select(`
      *,
      categories(name),
      menu_modifier_groups(
        sort_order,
        modifier_groups(
          *,
          modifier_options(*)
        )
      )
    `)
    .eq('is_available', true)
    .order('name')

  if (error) {
    console.error('Error fetching menus:', error)
    return []
  }

  // Transform data untuk memudahkan UI
  return data.map((menu: any) => ({
    ...menu,
    modifier_groups: menu.menu_modifier_groups
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((mg: any) => ({
        ...mg.modifier_groups,
        options: mg.modifier_groups.modifier_options
          .filter((opt: any) => opt.is_available)
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
      }))
  }))
}
