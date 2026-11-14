'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns'

async function requireReportUser() {
  return requireRole('admin', 'stakeholder')
}

export async function getSalesReport(range: 'daily' | 'monthly', date: string) {
  await requireReportUser()

  const targetDate = new Date(date)
  let start: string, end: string

  if (range === 'daily') {
    start = startOfDay(targetDate).toISOString()
    end = endOfDay(targetDate).toISOString()
  } else {
    start = startOfMonth(targetDate).toISOString()
    end = endOfMonth(targetDate).toISOString()
  }

  // 1. Ambil semua order lunas dalam range (tidak void)
  const { data: orders, error: ordersError } = await adminClient
    .from('orders')
    .select(`
      id,
      total,
      payment_status,
      order_status,
      created_at,
      payments (
        amount,
        method
      )
    `)
    .eq('payment_status', 'paid')
    .neq('order_status', 'cancelled')
    .gte('created_at', start)
    .lte('created_at', end)

  if (ordersError) throw ordersError

  // 2. Ambil pengeluaran dalam range
  const { data: expenses, error: expensesError } = await adminClient
    .from('expenses')
    .select('amount')
    .gte('expense_date', start.split('T')[0])
    .lte('expense_date', end.split('T')[0])

  if (expensesError) throw expensesError

  // 3. Hitung ringkasan
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const paymentMethods: Record<string, number> = {}
  orders.forEach(o => {
    (o.payments || []).forEach((p: any) => {
      const method = p.method || 'unknown'
      paymentMethods[method] = (paymentMethods[method] || 0) + p.amount
    })
  })

  // 4. Statistik Menu (Top 10)
  const { data: menuStats, error: menuError } = await adminClient
    .from('order_items')
    .select(`
      menu_name,
      price,
      qty,
      orders!inner (
        payment_status,
        order_status,
        created_at
      )
    `)
    .eq('orders.payment_status', 'paid')
    .neq('orders.order_status', 'cancelled')
    .gte('orders.created_at', start)
    .lte('orders.created_at', end)

  if (menuError) throw menuError

  const menuRanking: Record<string, { name: string, qty: number, total: number }> = {}
  menuStats.forEach((item: any) => {
    const key = item.menu_name
    if (!menuRanking[key]) menuRanking[key] = { name: key, qty: 0, total: 0 }
    menuRanking[key].qty += item.qty
    menuRanking[key].total += item.price * item.qty
  })

  const sortedMenus = Object.values(menuRanking).sort((a, b) => b.qty - a.qty)

  return {
    summary: {
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      orderCount: orders.length,
    },
    paymentMethods,
    topMenus: sortedMenus.slice(0, 10),
    bottomMenus: sortedMenus.slice(-10).reverse(),
    orders: orders.map(o => ({
      id: o.id,
      created_at: o.created_at,
      total: o.total,
      methods: (o.payments || []).map((p: any) => p.method).join(', ')
    }))
  }
}

export async function getAuditLogs() {
  await requireRole('admin')
  const { data, error } = await adminClient
    .from('activity_logs')
    .select(`
      *,
      user_profiles (full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error
  return data
}

export async function getVoidLogs() {
  await requireRole('admin')
  const { data, error } = await adminClient
    .from('void_logs')
    .select(`
      *,
      orders (order_code, total),
      requester:user_profiles!requested_by (full_name),
      approver:user_profiles!approved_by (full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
