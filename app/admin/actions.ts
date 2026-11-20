'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

export type Period = 'today' | '7d' | 'month'

function dayKey(iso: string): string {
  // Kunci hari dalam zona Jakarta (YYYY-MM-DD)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function periodBounds(period: Period, now = new Date()): { start: Date; prevStart: Date } {
  const start = new Date(now)
  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
  } else if (period === '7d') {
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
  } else {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  }
  const prevStart = new Date(start)
  if (period === 'today') prevStart.setDate(prevStart.getDate() - 1)
  else if (period === '7d') prevStart.setDate(prevStart.getDate() - 7)
  else prevStart.setMonth(prevStart.getMonth() - 1)
  return { start, prevStart }
}

const COUNTED = ['paid', 'preparing', 'ready', 'completed']
const ACTIVE_STATUS = ['paid', 'preparing']

export interface DashboardData {
  kpis: {
    revenue: number
    revenuePrev: number
    revenueDeltaPct: number
    txnCount: number
    expenses: number
    netProfit: number
    aov: number
    orderCount: number
    queueCount: number
    occupiedTables: number
    totalTables: number
  }
  cashflow: { label: string; income: number; expense: number }[]
  paymentMethods: { method: string; label: string; amount: number; pct: number }[]
  orderSources: { source: string; label: string; count: number; pct: number }[]
  recentOrders: {
    id: string
    short_number: number
    order_code: string
    customer_name: string
    table_name: string | null
    total: number
    method: string
    order_status: string
  }[]
  topMenus: { name: string; qty: number; revenue: number }[]
  period: Period
  range: { start: string; end: string }
}

export async function getAdminDashboard(period: Period): Promise<DashboardData> {
  await requireRole('admin', 'stakeholder')

  const now = new Date()
  const { start, prevStart } = periodBounds(period, now)

  // Orders (periode berjalan)
  const { data: orders, error: oErr } = await adminClient
    .from('orders')
    .select('id, short_number, order_code, customer_name, total, order_status, payment_status, order_source, created_at, discount_amount, tables(name), payments(method, status, amount)')
    .gte('created_at', start.toISOString())

  if (oErr) throw oErr

  const paid = (orders || []).filter(
    (o: any) => o.payment_status === 'paid' && COUNTED.includes(o.order_status) && o.order_status !== 'cancelled'
  )

  const revenue = paid.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
  const orderCount = paid.length
  const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0

  // Periode sebelumnya (untuk delta)
  const { data: prevOrders } = await adminClient
    .from('orders')
    .select('total, order_status, payment_status')
    .gte('created_at', prevStart.toISOString())
    .lt('created_at', start.toISOString())

  const prevPaid = (prevOrders || []).filter(
    (o: any) => o.payment_status === 'paid' && COUNTED.includes(o.order_status)
  )
  const revenuePrev = prevPaid.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
  const revenueDeltaPct = revenuePrev > 0
    ? Math.round(((revenue - revenuePrev) / revenuePrev) * 1000) / 10
    : (revenue > 0 ? 100 : 0)

  // Expenses
  const { data: expenses, error: eErr } = await adminClient
    .from('expenses')
    .select('amount, expense_date')
    .gte('expense_date', dayKey(start.toISOString()))
  if (eErr) throw eErr
  const totalExpenses = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0)

  // Queue & tables
  const { data: queueRows } = await adminClient
    .from('orders')
    .select('id')
    .eq('payment_status', 'paid')
    .in('order_status', ACTIVE_STATUS)
  const queueCount = queueRows?.length || 0

  const { data: tables } = await adminClient
    .from('tables')
    .select('id, status')
    .eq('is_active', true)
  const totalTables = tables?.length || 0
  const occupiedTables = (tables || []).filter((t: any) => t.status === 'terisi').length

  // Cashflow per hari
  const days: string[] = []
  const cursor = new Date(start)
  while (cursor <= now) {
    days.push(dayKey(cursor.toISOString()))
    cursor.setDate(cursor.getDate() + 1)
  }
  const incomeMap: Record<string, number> = {}
  const expenseMap: Record<string, number> = {}
  days.forEach((d) => { incomeMap[d] = 0; expenseMap[d] = 0 })

  paid.forEach((o: any) => {
    const k = dayKey(o.created_at)
    if (k in incomeMap) incomeMap[k] += Number(o.total || 0)
  })
  ;(expenses || []).forEach((e: any) => {
    const k = String(e.expense_date)
    if (k in expenseMap) expenseMap[k] += Number(e.amount || 0)
  })
  const cashflow = days.map((d) => ({
    label: new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    income: incomeMap[d] || 0,
    expense: expenseMap[d] || 0,
  }))

  // Metode pembayaran
  const methodMap: Record<string, number> = {}
  paid.forEach((o: any) => {
    const methods = (o.payments || []).filter((p: any) => p.status === 'paid')
    const m = methods[0]?.method || 'unknown'
    methodMap[m] = (methodMap[m] || 0) + Number(o.total || 0)
  })
  const methodTotal = Object.values(methodMap).reduce((a, b) => a + b, 0) || 1
  const METHOD_LABELS: Record<string, string> = {
    qris_xendit: 'QRIS Xendit', cash: 'Tunai', qris_manual: 'QRIS Manual',
    transfer: 'Transfer', edc_card: 'EDC', xendit_online: 'Xendit', unknown: 'Lainnya',
  }
  const paymentMethods = Object.entries(methodMap)
    .map(([method, amount]) => ({
      method,
      label: METHOD_LABELS[method] || method,
      amount,
      pct: Math.round((amount / methodTotal) * 100),
    }))
    .sort((a, b) => b.amount - a.amount)

  // Sumber order
  const sourceMap: Record<string, number> = {}
  paid.forEach((o: any) => {
    const s = o.order_source || 'qr_table'
    sourceMap[s] = (sourceMap[s] || 0) + 1
  })
  const sourceTotal = Object.values(sourceMap).reduce((a, b) => a + b, 0) || 1
  const SOURCE_LABELS: Record<string, string> = {
    qr_table: 'QR Meja', pos_cashier: 'Kasir POS',
  }
  const orderSources = Object.entries(sourceMap)
    .map(([source, count]) => ({
      source,
      label: SOURCE_LABELS[source] || source,
      count,
      pct: Math.round((count / sourceTotal) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Recent orders
  const recentOrders = (orders || [])
    .slice()
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((o: any) => ({
      id: o.id,
      short_number: o.short_number,
      order_code: o.order_code,
      customer_name: o.customer_name || '-',
      table_name: o.tables?.name || null,
      total: Number(o.total || 0),
      method: (o.payments || []).find((p: any) => p.status === 'paid')?.method || '-',
      order_status: o.order_status,
    }))

  // Top menu
  const { data: items, error: iErr } = await adminClient
    .from('order_items')
    .select('menu_name, price, qty, orders!inner(created_at, payment_status, order_status)')
    .gte('orders.created_at', start.toISOString())
  if (iErr) throw iErr
  const menuMap: Record<string, { name: string; qty: number; revenue: number }> = {}
  ;(items || []).forEach((it: any) => {
    const o = it.orders
    if (!o || o.payment_status !== 'paid' || !COUNTED.includes(o.order_status)) return
    const key = it.menu_name
    if (!menuMap[key]) menuMap[key] = { name: key, qty: 0, revenue: 0 }
    menuMap[key].qty += Number(it.qty || 0)
    menuMap[key].revenue += Number(it.price || 0) * Number(it.qty || 0)
  })
  const topMenus = Object.values(menuMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

  return {
    kpis: {
      revenue,
      revenuePrev,
      revenueDeltaPct,
      txnCount: paid.length,
      expenses: totalExpenses,
      netProfit: revenue - totalExpenses,
      aov,
      orderCount: (orders || []).length,
      queueCount,
      occupiedTables,
      totalTables,
    },
    cashflow,
    paymentMethods,
    orderSources,
    recentOrders,
    topMenus,
    period,
    range: { start: start.toISOString(), end: now.toISOString() },
  }
}