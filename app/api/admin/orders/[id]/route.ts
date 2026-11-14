import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from "@/lib/supabase/admin"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status } = await req.json()

  // 1. Validasi transisi status
  const { data: order } = await adminClient
    .from('orders')
    .select('order_status')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

  const validTransitions: Record<string, string[]> = {
    paid: ['preparing', 'cancelled'],
    preparing: ['ready'],
    ready: ['completed'],
    completed: [],
    cancelled: []
  }

  if (!validTransitions[order.order_status]?.includes(status)) {
    return NextResponse.json({ error: 'Transisi status tidak valid' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('orders')
    .update({ order_status: status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
