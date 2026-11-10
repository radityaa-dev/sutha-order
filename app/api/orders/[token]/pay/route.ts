import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../../../lib/supabase/admin'
import { createInvoice } from '../../../../../lib/xendit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: accessToken } = await params

  // 1. Fetch Order & Table status
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*, order_items(*), tables(is_active)')
    .eq('access_token', accessToken)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })
  }

  // Meja harus aktif
  if (!order.tables?.is_active) {
    return NextResponse.json({ error: 'Meja tidak aktif. Hubungi kasir.' }, { status: 400 })
  }

  // Cek jika dibatalkan admin
  if (order.order_status === 'cancelled') {
    return NextResponse.json({ error: 'Pesanan telah dibatalkan oleh admin.' }, { status: 400 })
  }

  // Jika sudah paid
  if (order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Pesanan sudah dibayar' }, { status: 409 })
  }

  // 2. Cek pembayaran pending eksisting
  const { data: existingPayment } = await adminClient
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existingPayment?.raw_payload?.invoice_url) {
    return NextResponse.json({ invoiceUrl: existingPayment.raw_payload.invoice_url })
  }

  // 3. Hitung jumlah percobaan pembayaran (max 3)
  const { count: attemptCount } = await adminClient
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('order_id', order.id)

  const currentAttempt = (attemptCount || 0) + 1
  if (currentAttempt > 3) {
    return NextResponse.json({ error: 'Maksimal percobaan pembayaran (3x) telah tercapai.' }, { status: 400 })
  }

  // Tentukan external_id
  const externalId = currentAttempt === 1 ? order.order_code : `${order.order_code}-R${currentAttempt}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const invoicePayload = {
    external_id: externalId,
    amount: Number(order.total),
    description: `Pesanan Sutha Corner ${order.order_code}`,
    customer: { given_names: order.customer_name || 'Pelanggan' },
    invoice_duration: 1800,
    currency: 'IDR',
    success_redirect_url: `${appUrl}/order/${order.access_token}`,
    failure_redirect_url: `${appUrl}/order/${order.access_token}`,
    items: order.order_items.map((i: { menu_name: string; qty: number; price: number; modifiers: any }) => ({
      name: i.menu_name + (i.modifiers?.length ? ' (' + i.modifiers.map((m: any) => m.option_name).join(', ') + ')' : ''),
      quantity: i.qty,
      price: i.price,
    })),
  }

  const invoice = await createInvoice(invoicePayload)

  // Kembalikan order status ke pending (jika sebelumnya expired)
  if (order.payment_status === 'expired') {
    await adminClient
      .from('orders')
      .update({ payment_status: 'pending', order_status: 'pending' })
      .eq('id', order.id)
  }

  // Insert payment record baru
  const { error: payErr } = await adminClient.from('payments').insert({
    order_id: order.id,
    external_id: externalId,
    transaction_id: invoice.id,
    amount: Number(invoice.amount),
    status: 'pending',
    raw_payload: { invoice_url: invoice.invoice_url },
  })

  // Jika terjadi race condition (partial unique index breach), ambil payment pending yang menang
  if (payErr) {
    const { data: fallbackPay } = await adminClient
      .from('payments')
      .select('*')
      .eq('order_id', order.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (fallbackPay?.raw_payload?.invoice_url) {
      return NextResponse.json({ invoiceUrl: fallbackPay.raw_payload.invoice_url })
    }
    return NextResponse.json({ error: 'Gagal memproses invoice' }, { status: 500 })
  }

  return NextResponse.json({ invoiceUrl: invoice.invoice_url })
}
