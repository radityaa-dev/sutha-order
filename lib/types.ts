export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'expired'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired'

export interface Category {
  id: string
  name: string
  sort_order: number
}

export interface Menu {
  id: string
  category_id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
}

export interface Table {
  id: string
  name: string
  token: string
  is_active: boolean
}

export interface Order {
  id: string
  order_code: string
  table_id: string
  customer_name: string | null
  notes: string | null
  total: number
  order_status: OrderStatus
  payment_status: PaymentStatus
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_id: string
  menu_name: string
  price: number
  qty: number
  notes: string | null
}

export interface Payment {
  id: string
  order_id: string
  transaction_id: string | null
  payment_method: string | null
  amount: number
  status: string | null
  paid_at: string | null
  raw_payload: any | null
}
