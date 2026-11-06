import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  id: string
  name: string
  price: number
  qty: number
  notes: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (id: string) => void
  updateQty: (id: string, delta: number) => void
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => {
        const existing = state.items.find(i => i.id === item.id && i.notes === item.notes)
        if (existing) {
          return { items: state.items.map(i => i.id === item.id && i.notes === item.notes ? { ...i, qty: i.qty + 1 } : i) }
        }
        return { items: [...state.items, { ...item, qty: 1 }] }
      }),
      removeItem: (id) => set((state) => ({ items: state.items.filter(i => i.id !== id) })),
      updateQty: (id, delta) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0)
      })),
      clearCart: () => set({ items: [] }),
    }),
    { name: 'sutha-cart' }
  )
)
