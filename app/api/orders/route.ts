import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../lib/supabase/admin'
import { orderSchema } from '../../../lib/order-schema'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('DEBUG: Payload diterima:', body)
    
    const result = orderSchema.safeParse(body)
    if (!result.success) {
      console.error('DEBUG: Zod Error:', result.error.format())
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: result.error.format() 
      }, { status: 400 })
    }

    const { token, name, notes, items } = result.data

    // Mapping menuId (camelCase) ke menu_id (snake_case) untuk fungsi SQL
    const formattedItems = items.map(i => ({
      menu_id: i.menuId,
      qty: i.qty,
      notes: i.notes || ''
    }))

    const { data: order_code, error: rpcError } = await adminClient.rpc('create_order', {
      p_table_token: token,
      p_customer_name: name,
      p_notes: notes || '',
      p_items: formattedItems // Kirim array objek langsung
    })

    if (rpcError) {
      console.error('DEBUG: Supabase RPC Error:', rpcError)
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    console.log('DEBUG: Order Berhasil:', order_code)
    return NextResponse.json({ order_code })
  } catch (err: any) {
    console.error('DEBUG: API Fatal Error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
