import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from "@/lib/supabase/admin"
import { rateLimit, getClientIp } from "@/lib/rate-limit"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: accessToken } = await params

  // Rate limiting (60 req/min per IP)
  if (!rateLimit(`orders:get:${getClientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 })
  }

  // Fetch only public data
  const { data: order, error } = await adminClient
    .from('orders')
    .select(`
      order_code,
      short_number,
      total,
      order_status,
      payment_status,
      payment_mode,
      open_bill_status,
      serving_method,
      accepted_at,
      ready_at,
      created_at,
      order_items (id, menu_name, price, qty, notes, modifiers),
      tables (name)
    `)
    .eq('access_token', accessToken)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json(order)
}
