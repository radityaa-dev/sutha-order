import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../../lib/supabase/admin'

export async function GET(req: NextRequest) {
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
