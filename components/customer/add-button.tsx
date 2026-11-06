'use client'

import { useCartStore } from '../../lib/store'
import { Button } from '../../components/ui/button'

export function AddButton({ menu }: { menu: any }) {
  const addItem = useCartStore(state => state.addItem)

  return (
    <Button 
      size="sm" 
      disabled={!menu.is_available} 
      onClick={() => addItem({ id: menu.id, name: menu.name, price: menu.price, notes: '' })}
    >
      Tambah
    </Button>
  )
}
