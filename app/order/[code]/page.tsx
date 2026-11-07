import { adminClient } from '../../../lib/supabase/admin'
import OrderStatusClient from '../../../components/customer/order-status-client'
import { notFound } from 'next/navigation'
import { Order } from '../../../lib/types'

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data: initialOrder } = await adminClient
    .from('orders')
    .select(`
      id, 
      order_code, 
      customer_name, 
      total, 
      order_status, 
      payment_status, 
      created_at,
      order_items (id, menu_name, price, qty, notes),
      tables (name)
    `)
    .eq('order_code', code)
    .single()

  if (!initialOrder) notFound()

  return <OrderStatusClient code={code} initialOrder={initialOrder as unknown as Order} />
}
