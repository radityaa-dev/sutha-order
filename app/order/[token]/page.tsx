import { adminClient } from '../../../lib/supabase/admin'
import OrderStatusClient from '../../../components/customer/order-status-client'
import { notFound } from 'next/navigation'

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: accessToken } = await params

  const { data: initialOrder } = await adminClient
    .from('orders')
    .select(`
      order_code, 
      total, 
      order_status, 
      payment_status, 
      created_at,
      order_items (id, menu_name, price, qty, notes, modifiers),
      tables (name)
    `)
    .eq('access_token', accessToken)
    .single()

  if (!initialOrder) notFound()

  return <OrderStatusClient accessToken={accessToken} initialOrder={initialOrder as any} />
}
