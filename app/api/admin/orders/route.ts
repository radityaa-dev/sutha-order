import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth"

export async function GET(req: NextRequest) {
  await requireRole('admin', 'kasir', 'dapur', 'stakeholder')
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = adminClient
    .from('orders')
    .select('*, order_items(*), tables(name)')
    .order('created_at', { ascending: false })

  if (status === 'paid') {
    query = query.eq('payment_status', 'paid')
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  await requireRole('admin', 'kasir', 'dapur')
  const { orderId, nextStatus } = await req.json()

  if (!orderId || !nextStatus) {
    return NextResponse.json({ error: 'Parameter tidak lengkap' }, { status: 400 })
  }

  const { data: order, error: fetchError } = await adminClient
    .from('orders')
    .select('id, order_status, accepted_at')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
  }

  const validTransitions: Record<string, string[]> = {
    paid: ['preparing'],
    preparing: ['ready'],
    ready: ['completed'],
  }

  if (!validTransitions[order.order_status]?.includes(nextStatus)) {
    return NextResponse.json({ error: 'Transisi status tidak valid' }, { status: 400 })
  }

  const updates: any = { order_status: nextStatus }
  if (nextStatus === 'preparing' && !order.accepted_at) {
    updates.accepted_at = new Date().toISOString()
  }
  if (nextStatus === 'ready') {
    updates.ready_at = new Date().toISOString()
  }
  if (nextStatus === 'completed') {
    updates.completed_at = new Date().toISOString()
  }

  const { error } = await adminClient
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
