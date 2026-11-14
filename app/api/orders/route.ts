import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../lib/supabase/admin'
import { orderSchema } from '../../../lib/order-schema'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    const result = orderSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: result.error.format() 
      }, { status: 400 })
    }

    const { token, name, notes, items, serving_method, payment_mode } = result.data

    // Mapping: client kirim optionIds (UUID[]), server akan validasi & hitung harga
    const formattedItems = items.map(i => ({
      menu_id: i.menuId,
      qty: i.qty,
      notes: i.notes || '',
      option_ids: i.optionIds || []
    }))

    const { data: orderResult, error: rpcError } = await adminClient.rpc('create_qr_order', {
      p_table_token: token,
      p_customer_name: name,
      p_notes: notes || '',
      p_items: formattedItems,
      p_serving_method: serving_method,
      p_payment_mode: payment_mode,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 })
    }

    // orderResult: { order_code: string, access_token: string }
    return NextResponse.json(orderResult)
  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}