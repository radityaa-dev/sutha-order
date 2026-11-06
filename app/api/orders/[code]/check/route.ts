import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '../../../../../lib/supabase/admin'
import { listInvoices, getInvoice } from '../../../../../lib/xendit'
import { syncPayment } from '../../../../../lib/payments/syncPayment'

const checkCooldown = new Map<string, number>()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  
  // 1. Ambil data order
  const { data: order } = await adminClient
    .from('orders')
    .select('id, payment_status')
    .eq('order_code', code)
    .single()

  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 })

  // 2. Rate Limit (hanya jika sudah pernah memanggil Xendit)
  const now = Date.now()
  const lastCheck = checkCooldown.get(code) || 0
  if (now - lastCheck < 5000) {
    return NextResponse.json({ status: order.payment_status, rateLimited: true })
  }

  // 3. Fallback: Cari invoice di Xendit jika belum ada transaction_id
  let { data: payment } = await adminClient
    .from('payments')
    .select('transaction_id')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .single()

  if (!payment?.transaction_id) {
    console.log('[SYNC] Fallback: Mencari invoice di Xendit untuk:', code)
    const invoices = await listInvoices(code)
    if (invoices && invoices.length > 0) {
      const inv = invoices[0]
      await adminClient.from('payments').insert({
        order_id: order.id,
        transaction_id: inv.id,
        amount: inv.amount,
        status: inv.status.toLowerCase(),
        raw_payload: inv,
      })
      payment = { transaction_id: inv.id }
    } else {
      return NextResponse.json({ error: 'Belum ada pembayaran dimulai' }, { status: 404 })
    }
  }

  checkCooldown.set(code, now)

  // 4. Sync
  try {
    const invoice = await getInvoice(payment.transaction_id)
    await syncPayment(invoice)
    return NextResponse.json({ success: true, status: invoice.status.toLowerCase() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
