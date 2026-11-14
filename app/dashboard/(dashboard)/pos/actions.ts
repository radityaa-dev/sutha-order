'use server'

import { adminClient } from '../../../../lib/supabase/admin'
import { requireRole } from '../../../../lib/auth'

// POS hanya untuk admin & kasir
async function requirePos() {
  return requireRole('admin', 'kasir')
}

// ============================================================
// Data Menu (grid POS)
// ============================================================
export async function getPosCatalog() {
  await requirePos()
  const [menus, bundles, categories] = await Promise.all([
    adminClient
      .from('menus')
      .select('id, name, price, image_url, is_available, is_active, category_id, categories(name, station), description')
      .eq('is_available', true)
      .order('name'),
    adminClient
      .from('bundles')
      .select('id, name, price, description, is_active')
      .eq('is_active', true)
      .order('name'),
    adminClient
      .from('categories')
      .select('id, name, station, sort_order')
      .order('sort_order', { ascending: true }),
  ])

  const err = menus.error || bundles.error || categories.error
  if (err) throw err

  return {
    menus: menus.data,
    bundles: bundles.data,
    categories: categories.data,
  }
}

// Modifier untuk dialog varian (per menu)
export async function getMenuModifiers(menuId: string) {
  await requirePos()
  const { data, error } = await adminClient
    .from('menu_modifier_groups')
    .select('group_id, modifier_groups(*)')
    .eq('menu_id', menuId)
  if (error) throw error
  return data.map((d: any) => d.modifier_groups)
}

// ============================================================
// Shift
// ============================================================
export async function getMyShift() {
  await requirePos()
  const { data, error } = await adminClient
    .from('shifts')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getMyOpenShift() {
  await requirePos()
  const { data, error } = await adminClient
    .from('shifts')
    .select('*')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function doOpenShift(openingCash: number) {
  const user = await requirePos()
  const { data, error } = await adminClient.rpc('open_shift', {
    p_user_id: user.id,
    p_opening_cash: openingCash,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function doCloseShift(shiftId: string, countedCash: number) {
  await requirePos()
  const { data, error } = await adminClient.rpc('close_shift', {
    p_shift_id: shiftId,
    p_counted_cash: countedCash,
  })
  if (error) throw new Error(error.message)
  return data
}

// ============================================================
// Orders (open bill & antrean)
// ============================================================
export async function getActiveOpenBills() {
  await requirePos()
  const { data, error } = await adminClient
    .from('orders')
    .select('*, order_items(*), tables(name, token)')
    .eq('payment_mode', 'open_bill')
    .neq('payment_status', 'paid')
    .in('open_bill_status', ['pending_approval', 'approved'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getPendingApprovalOpenBills() {
  await requirePos()
  const { data, error } = await adminClient
    .from('orders')
    .select('*, order_items(*), tables(name, token)')
    .eq('open_bill_status', 'pending_approval')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ============================================================
// RPC actions
// ============================================================
export async function rpcCreatePosOrder(args: any) {
  const user = await requirePos()
  const { data, error } = await adminClient.rpc('create_pos_order', {
    ...args,
    p_created_by: user.id,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function rpcApproveOpenBill(orderId: string) {
  const user = await requirePos()
  const { data, error } = await adminClient.rpc('approve_open_bill', {
    p_order_id: orderId,
    p_approved_by: user.id,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function rpcAppendItems(orderId: string, items: any[]) {
  const user = await requirePos()
  const { data, error } = await adminClient.rpc('append_open_bill_items', {
    p_order_id: orderId,
    p_items: items,
    p_created_by: user.id,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function rpcApplyDiscount(orderId: string, amount: number, reason: string, adminUserId: string, pin: string) {
  await requirePos()
  const { data, error } = await adminClient.rpc('apply_discount_with_pin', {
    p_order_id: orderId,
    p_discount_amount: amount,
    p_reason: reason,
    p_admin_user_id: adminUserId,
    p_pin: pin,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function rpcVoidOrder(orderId: string, reason: string, adminUserId: string, pin: string) {
  await requirePos()
  const { data, error } = await adminClient.rpc('process_void_with_pin', {
    p_order_id: orderId,
    p_reason: reason,
    p_admin_user_id: adminUserId,
    p_pin: pin,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function rpcSettleOrder(orderId: string, method: string, cashReceived: number | null) {
  const user = await requirePos()
  const { data, error } = await adminClient.rpc('settle_order_payment', {
    p_order_id: orderId,
    p_method: method,
    p_cash_received: cashReceived,
    p_created_by: user.id,
  })
  if (error) throw new Error(error.message)
  return data
}

// Admin list untuk verifikasi PIN (hanya admin aktif dengan PIN)
export async function getAdminUsers() {
  await requirePos()
  const { data, error } = await adminClient
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('role', 'admin')
    .eq('is_active', true)
    .not('auth_pin_hash', 'is', null)
  if (error) throw error
  return data
}

// ============================================================
// Tables (untuk dropdown walk-in)
// ============================================================
export async function getPosTables() {
  await requirePos()
  const { data, error } = await adminClient
    .from('tables')
    .select('id, name, area, capacity, status, is_active')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}
