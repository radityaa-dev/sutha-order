import { adminClient } from '../supabase/admin'

export async function syncPayment(invoice: any) {
  const { external_id: order_code, status, amount, payment_method, paid_at, id: transaction_id } = invoice

  console.log('[SYNC] Data masuk:', { order_code, status, amount, transaction_id })

  // 1. Ambil data order
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*')
    .eq('order_code', order_code)
    .single()

  if (orderErr || !order) {
    console.error('[SYNC] Order not found:', order_code)
    throw new Error('Order tidak ditemukan')
  }

  console.log('[SYNC] Order ditemukan:', { id: order.id, payment_status: order.payment_status, total: order.total })

  // 2. Jika sudah lunas, abaikan
  if (order.payment_status === 'paid') {
    console.log('[SYNC] Sudah paid, skip')
    return
  }

  // 3. Tentukan status baru
  let newPaymentStatus: string | null = null
  let newOrderStatus: string | null = null

  const xenditStatus = String(status).toUpperCase()
  
  if (xenditStatus === 'PAID' || xenditStatus === 'SETTLED') {
    const xenditAmount = Math.round(Number(amount))
    const dbAmount = Math.round(Number(order.total))
    
    console.log('[SYNC] Amount check:', { xenditAmount, dbAmount })

    if (xenditAmount !== dbAmount) {
      console.error('[SYNC] Amount mismatch:', { xenditAmount, dbAmount })
      if (Math.abs(xenditAmount - dbAmount) > 10) {
        throw new Error('Amount mismatch')
      }
    }
    newPaymentStatus = 'paid'
    newOrderStatus = 'paid'
  } else if (xenditStatus === 'EXPIRED') {
    newPaymentStatus = 'expired'
    newOrderStatus = 'expired'
  }

  if (!newPaymentStatus) {
    console.log('[SYNC] Status tidak diproses:', xenditStatus)
    return
  }

  console.log('[SYNC] Update status:', { newPaymentStatus, newOrderStatus })

  // 4. Update Database secara atomik
  const { error: updOrderErr, count: orderCount } = await adminClient
    .from('orders')
    .update({
      payment_status: newPaymentStatus,
      order_status: newOrderStatus as any,
    })
    .eq('id', order.id)
    .select()

  console.log('[SYNC] Update orders result:', { error: updOrderErr, count: orderCount })

  if (updOrderErr) throw updOrderErr
  if (!orderCount || orderCount === 0) throw new Error('0 rows updated in orders')

  const { error: updPayErr, count: payCount } = await adminClient
    .from('payments')
    .update({
      status: newPaymentStatus,
      paid_at: paid_at || new Date().toISOString(),
      payment_method: payment_method || 'XENDIT',
      raw_payload: invoice,
    })
    .eq('transaction_id', transaction_id)
    .select()

  console.log('[SYNC] Update payments result:', { error: updPayErr, count: payCount })

  if (updPayErr) throw updPayErr
  if (!payCount || payCount === 0) throw new Error('0 rows updated in payments')

  console.log('[SYNC] Selesai:', order_code, '->', newPaymentStatus)
}