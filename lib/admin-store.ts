import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface AdminOrderStore {
  newOrderCount: number
  setNewOrderCount: (count: number) => void
}

export const useAdminOrderStore = create<AdminOrderStore>()(
  subscribeWithSelector((set) => ({
    newOrderCount: 0,
    setNewOrderCount: (count) => set({ newOrderCount: count }),
  }))
)
