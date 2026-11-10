export interface ModifierOption {
  id: string
  group_id: string
  name: string
  price_delta: number
  is_available: boolean
  sort_order: number
}

export interface ModifierGroup {
  id: string
  name: string
  selection_type: 'single' | 'multiple'
  is_required: boolean
  min_select: number
  max_select: number | null
  sort_order: number
  created_at: string
  options?: ModifierOption[]
}

export interface OrderItem {
  id: string
  menu_name: string
  price: number
  qty: number
  notes?: string
  modifiers: {
    group_name: string
    option_name: string
    price_delta: number
  }[]
  base_price: number
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
