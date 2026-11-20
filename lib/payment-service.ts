import { adminClient } from './supabase/admin'

/**
 * Selesaikan pembayaran QRIS secara idempotent.
 * Memakai RPC settle_qr_payment (SECURITY DEFINER, service_role only).
 * Mengembalikan { status } — 'paid' | 'noop' | 'refund_pending' | 'amount_mismatch'.
 */
export async function settleQrPayment(
  paymentId: string,
  amount: number,
  transactionId?: string
) {
  const { data, error } = await adminClient.rpc('settle_qr_payment', {
    p_payment_id: paymentId,
    p_paid_amount: Math.round(Number(amount)),
    p_transaction_id: transactionId ?? null,
    p_method: 'qris_xendit',
  })

  if (error) throw new Error(error.message)

  const result = (data as any)?.result || 'unknown'
  return {
    status: result,
    order_id: (data as any)?.order_id ?? null,
    payment_id: (data as any)?.payment_id ?? paymentId,
  }
}