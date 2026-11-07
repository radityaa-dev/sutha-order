import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../../lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const { data: order, error } = await adminClient
    .from('orders')
    .select(`
      id, 
      order_code, 
      customer_name, 
      total, 
      order_status, 
      payment_status, 
      created_at,
      order_items (id, menu_name, price, qty, notes),
      tables (name)
    `)
    .eq('order_code', code)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json(order)
}
