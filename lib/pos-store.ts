import { create } from 'zustand'

export interface PosCartItem {
  lineId: string
  kind: 'menu' | 'bundle'
  menuId: string | null
  bundleId: string | null
  name: string
  unitPrice: number
  basePrice: number
  qty: number
  notes: string
  optionIds: string[]
  modifiers: { group_name: string; option_name: string; price_delta: number }[]
}

function makeLineId(item: Omit<PosCartItem, 'lineId' | 'qty'>): string {
  const optionKey = item.optionIds.slice().sort().join(',')
  return [item.kind, item.menuId, item.bundleId, optionKey, item.notes].join('|')
}

interface PosCartState {
  items: PosCartItem[]
  customerName: string
  tableId: string | null
  servingMethod: string
  addItem: (item: Omit<PosCartItem, 'lineId' | 'qty'>) => void
  updateQty: (lineId: string, qty: number) => void
  removeItem: (lineId: string) => void
  clear: () => void
  setCustomerName: (name: string) => void
  setTableId: (id: string | null) => void
  setServingMethod: (method: string) => void
}

export const usePosCart = create<PosCartState>((set, get) => ({
  items: [],
  customerName: '',
  tableId: null,
  servingMethod: 'ambil_sendiri',

  addItem: (item) => {
    const lineId = makeLineId(item)
    const existing = get().items.find((i) => i.lineId === lineId)
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.lineId === lineId ? { ...i, qty: i.qty + 1 } : i
        ),
      })
    } else {
      set({ items: [...get().items, { ...item, lineId, qty: 1 }] })
    }
  },

  updateQty: (lineId, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter((i) => i.lineId !== lineId) })
    } else {
      set({
        items: get().items.map((i) => (i.lineId === lineId ? { ...i, qty } : i)),
      })
    }
  },

  removeItem: (lineId) => {
    set({ items: get().items.filter((i) => i.lineId !== lineId) })
  },

  clear: () => set({ items: [], customerName: '', tableId: null, servingMethod: 'ambil_sendiri' }),

  setCustomerName: (name) => set({ customerName: name }),
  setTableId: (id) => set({ tableId: id }),
  setServingMethod: (method) => set({ servingMethod: method }),
}))

export function cartSubtotal(items: PosCartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
}

export function cartToRpcItems(items: PosCartItem[]) {
  return items.map((i) => ({
    menu_id: i.menuId,
    bundle_id: i.bundleId,
    qty: i.qty,
    notes: i.notes || null,
    option_ids: i.optionIds.length ? i.optionIds : null,
  }))
}
