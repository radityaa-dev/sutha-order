'use client'

import { ItemSheet } from './item-sheet'
import { Button } from '../ui/button'
import { Plus } from 'lucide-react'

export function AddButton({ menu }: { menu: any }) {
  if (!menu.is_available) {
    return <span className="text-[13px] font-semibold text-[var(--danger)]">Habis</span>
  }

  return (
    <ItemSheet menu={menu}>
      <Button className="h-11 min-w-[104px] rounded-[var(--radius-sm)] px-4 text-[14px] font-semibold">
        <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
        Tambah
      </Button>
    </ItemSheet>
  )
}
