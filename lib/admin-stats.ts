import { adminClient } from './supabase/admin'

const JAKARTA = 'Asia/Jakarta'

export function getJakartaDayBounds(now = new Date()) {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const start = new Date(`${dateStr}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

const COUNTED_STATUSES = ['paid', 'preparing', 'ready', 'completed']
const QUEUE_STATUSES = ['paid', 'preparing', 'ready']

export async function getDashboardStats(now = new Date()) {
  const { start, end } = getJakartaDayBounds(now)

  const { data: todayRows, error: todayErr } = await adminClient
    .from('orders')
    .select('id, total, order_status, payment_status, created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', start)
    .lt('created_at', end)

  if (todayErr) throw new Error(todayErr.message)

  const todayPaid = (todayRows || []).filter((row) =>
    COUNTED_STATUSES.includes(row.order_status)
  )

  const { data: queueRows, error: queueErr } = await adminClient
    .from('orders')
    .select('id')
    .eq('payment_status', 'paid')
    .in('order_status', QUEUE_STATUSES)

  if (queueErr) throw new Error(queueErr.message)

  return {
    todayOrders: todayPaid.length,
    todaySales: todayPaid.reduce((sum, row) => sum + Number(row.total || 0), 0),
    activeQueue: queueRows?.length || 0,
    range: { start, end },
  }
}
