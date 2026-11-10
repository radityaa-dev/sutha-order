import { adminClient } from '../supabase/admin'

export async function syncPayment(invoice: any) {
  const { data, error } = await adminClient.rpc('apply_payment_status', {
    p_invoice_id: invoice.id,
    p_status: invoice.status.toLowerCase(),
    p_amount: Math.round(Number(invoice.amount)),
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
