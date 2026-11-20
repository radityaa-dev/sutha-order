import { adminClient } from '../supabase/admin'

export async function syncPayment(invoice: any) {
  // Validasi amount
  const { data: payment, error: paymentError } = await adminClient
    .from('payments')
    .select('id, order_id, amount, method, status')
    .eq('transaction_id', invoice.id)
    .maybeSingle()

  if (paymentError) {
    console.error('[SYNC] Error fetching payment:', paymentError)
    throw paymentError
  }

  if (!payment) {
    console.error('[SYNC] Payment not found for invoice:', invoice.id)
    throw new Error('Payment not found')
  }

  // Validasi amount
  const paidAmount = Math.round(Number(invoice.amount))
  if (paidAmount !== payment.amount) {
    console.error('[SYNC] Amount mismatch:', {
      invoiceId: invoice.id,
      paidAmount,
      expectedAmount: payment.amount,
    })
    return 'amount_mismatch'
  }

  const { data, error } = await adminClient.rpc('apply_payment_status', {
    p_invoice_id: invoice.id,
    p_status: invoice.status.toLowerCase(),
    p_amount: paidAmount,
    p_method: invoice.payment_method || 'xendit',
    p_paid_at: invoice.paid_at || new Date().toISOString(),
    p_payload: invoice
  })

  if (error) {
    console.error('[SYNC] RPC Error:', error)
    throw error
  }

  return data
}
