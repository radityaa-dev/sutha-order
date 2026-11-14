import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from "@/lib/supabase/admin"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: accessToken } = await params
    const body = await req.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Item tidak valid' }, { status: 400 })
    }

    // Panggil RPC append_open_bill_items
    const { data, error } = await adminClient.rpc('append_open_bill_items', {
      p_order_token: accessToken,
      p_items: items.map((i: any) => ({
        menu_id: i.menuId,
        qty: i.qty,
        notes: i.notes || '',
        option_ids: i.optionIds || []
      }))
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}
