'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartModifier {
  group_name: string
  option_name: string
  price_delta: number
  option_id: string
}

export interface CartItem {
  lineId: string
  id: string
  name: string
  price: number // Final price per unit (base + modifiers)
  base_price: number
  qty: number
  notes: string
  modifiers: CartModifier[]
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'lineId'>) => void
  removeItem: (lineId: string) => void
  updateQty: (lineId: string, delta: number) => void
  clearCart: () => void
}

function generateLineId(item: Omit<CartItem, 'lineId'>) {
  const modsKey = item.modifiers
    .map(m => `${m.group_name}:${m.option_name}`)
    .sort()
    .join('|')
  return `${item.id}-${modsKey}-${item.notes}`
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((state) => {
        // Migration check
        if (!Array.isArray(state.items)) return { items: [{ ...item, lineId: generateLineId(item) }] }
        
        const lineId = generateLineId(item)
        const existing = state.items.find(i => i.lineId === lineId)
        
        if (existing) {
          return {
            items: state.items.map(i => 
              i.lineId === lineId ? { ...i, qty: i.qty + item.qty } : i
            )
          }
        }
        
        return { items: [...state.items, { ...item, lineId }] }
      }),
      removeItem: (lineId) => set((state) => ({ 
        items: state.items.filter(i => i.lineId !== lineId) 
      })),
      updateQty: (lineId, delta) => set((state) => ({
        items: state.items.map(i => 
          i.lineId === lineId ? { ...i, qty: Math.max(0, i.qty + delta) } : i
        ).filter(i => i.qty > 0)
      })),
      clearCart: () => set({ items: [] }),
    }),
    { 
      name: 'sutha-cart',
      // Reset logic if data format is completely wrong
      onRehydrateStorage: () => (state) => {
        if (state && (!state.items || !Array.isArray(state.items))) {
          state.clearCart()
        }
      }
    }
  )
)
