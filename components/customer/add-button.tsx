'use client'

import { ItemSheet } from './item-sheet'
import { Button } from '../ui/button'

export function AddButton({ menu }: { menu: any }) {
  if (!menu.is_available) return <span className="text-xs text-destructive font-semibold">Habis</span>

  return (
    <ItemSheet menu={menu}>
      <Button size="sm">Tambah</Button>
    </ItemSheet>
  )
}
