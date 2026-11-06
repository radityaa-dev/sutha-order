import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../../../lib/supabase/admin'
import { createInvoice } from '../../../../../lib/xendit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  console.log('[SYNC] PAY API HIT!')
  const { code } = await params

  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_code', code)
    .single()

  if (orderErr || !order) {
    console.error('[SYNC] Order not found in /pay:', code, orderErr)
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
  }

  if (order.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Pembayaran sudah diproses' }, { status: 409 })
  }

  // Cek invoice pending yang masih valid
  const { data: existingPayment } = await adminClient
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  console.log('[SYNC] Existing payment check:', existingPayment)

  if (existingPayment?.raw_payload?.invoice_url) {
    console.log('[SYNC] Existing payment found, returning existing URL')
    return NextResponse.json({ invoiceUrl: existingPayment.raw_payload.invoice_url })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const invoicePayload = {
    external_id: order.order_code,
    amount: Number(order.total),
    description: `Pesanan Sutha Corner ${order.order_code}`,
    customer: { given_names: order.customer_name || 'Pelanggan' },
    invoice_duration: 1800,
    currency: 'IDR',
    success_redirect_url: `${appUrl}/order/${order.order_code}`,
    failure_redirect_url: `${appUrl}/order/${order.order_code}`,
    items: order.order_items.map((i: { menu_name: string; qty: number; price: number }) => ({
      name: i.menu_name,
      quantity: i.qty,
      price: i.price,
    })),
  }

  console.log('[SYNC] Payload Xendit:', JSON.stringify(invoicePayload))
  const invoice = await createInvoice(invoicePayload)

  console.log('[SYNC] Inserting payment record for order:', order.id, 'Transaction ID:', invoice.id)
  const { error: payErr, data: insertedPay } = await adminClient.from('payments').insert({
    order_id: order.id,
    transaction_id: invoice.id,
    amount: Number(invoice.amount),
    status: 'pending',
    raw_payload: { invoice_url: invoice.invoice_url },
  }).select()

  if (payErr) {
    console.error('[SYNC] Gagal insert payments:', payErr)
    return NextResponse.json({ error: 'Gagal menyimpan pembayaran' }, { status: 500 })
  }

  console.log('[SYNC] Payment berhasil disimpan:', insertedPay)
  return NextResponse.json({ invoiceUrl: invoice.invoice_url })
}
