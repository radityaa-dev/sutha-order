export interface OrderItem {
  id: string
  menu_name: string
  price: number
  qty: number
  notes?: string
}

export interface Order {
  id: string
  order_code: string
  customer_name: string
  total: number
  order_status: 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'expired'
  payment_status: 'pending' | 'paid' | 'failed' | 'expired'
  created_at: string
  order_items: OrderItem[]
  tables?: {
    name: string
  }
}
