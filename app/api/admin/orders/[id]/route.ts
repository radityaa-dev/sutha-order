import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from "@/lib/supabase/admin"
import { requireFeature } from "@/lib/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ubah status dapur (Diproses -> Siap) = fitur kitchen level full (dapur).
    await requireFeature('kitchen', 'full')

    const { id } = await params
    const { status } = await req.json()

    if (!status) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

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
  } catch (e: any) {
    const msg = e?.message || 'Unauthorized'
    const code = msg === 'Unauthorized' || msg.includes('tidak memiliki akses') ? 403 : 500
    return NextResponse.json({ error: msg }, { status: code })
  }
}