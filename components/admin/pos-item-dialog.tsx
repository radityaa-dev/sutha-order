'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { formatRupiah } from '../../lib/format'
import { getMenuModifiers } from '../../app/dashboard/(dashboard)/pos/actions'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

export interface PendingItem {
  menuId: string
  bundleId: string | null
  name: string
  unitPrice: number
  basePrice: number
  image_url?: string | null
  description?: string | null
}

interface PosItemDialogProps {
  item: PendingItem | null
  onClose: () => void
  onConfirm: (payload: {
    kind: 'menu' | 'bundle'
    menuId: string | null
    bundleId: string | null
    name: string
    unitPrice: number
    basePrice: number
    optionIds: string[]
    notes: string
    modifiers: { group_name: string; option_name: string; price_delta: number }[]
  }) => void
}

interface ModifierGroup {
  id: string
  name: string
  selection_type: 'single' | 'multiple'
  is_required: boolean
  min_select: number
  max_select: number | null
  modifier_options: { id: string; name: string; price_delta: number; is_available: boolean }[]
}

export function PosItemDialog({ item, onClose, onConfirm }: PosItemDialogProps) {
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset & load modifier saat item berubah
  useEffect(() => {
    setNotes('')
    setSelected({})
    if (!item) return

    if (item.bundleId) {
      setGroups([])
      return
    }

    setLoading(true)
    getMenuModifiers(item.menuId)
      .then((groups) => setGroups(groups))
      .catch(() => toast.error('Gagal memuat add-on'))
      .finally(() => setLoading(false))
  }, [item])

  if (!item) return null

  const isBundle = !!item.bundleId

  function toggleOption(groupId: string, optionId: string) {
    setSelected((prev) => {
      const group = groups.find((g) => g.id === groupId)
      const current = prev[groupId] || []
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) }
      }
      if (group?.selection_type === 'single') {
        return { ...prev, [groupId]: [optionId] }
      }
      if (group?.max_select && current.length >= group.max_select) {
        toast.error(`Maksimal ${group.max_select} pilihan untuk ${group.name}`)
        return prev
      }
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  function calcPrice(): number {
    let price = item?.unitPrice ?? 0
    for (const group of groups) {
      for (const optId of selected[group.id] || []) {
        const opt = group.modifier_options.find((o) => o.id === optId)
        if (opt) price += opt.price_delta
      }
    }
    return price
  }

  function handleConfirm() {
    // Validasi required groups
    for (const group of groups) {
      if (group.is_required && (selected[group.id] || []).length < (group.min_select || 1)) {
        toast.error(`Wajib memilih ${group.name}`)
        return
      }
    }

    const modifiers: { group_name: string; option_name: string; price_delta: number }[] = []
    const optionIds: string[] = []
    for (const group of groups) {
      for (const optId of selected[group.id] || []) {
        const opt = group.modifier_options.find((o) => o.id === optId)
        if (opt) {
          modifiers.push({ group_name: group.name, option_name: opt.name, price_delta: opt.price_delta })
          optionIds.push(optId)
        }
      }
    }

    if (!item) return

    onConfirm({
      kind: isBundle ? 'bundle' : 'menu',
      menuId: isBundle ? null : item.menuId,
      bundleId: isBundle ? item.bundleId : null,
      name: item.name,
      unitPrice: calcPrice(),
      basePrice: item.basePrice,
      optionIds,
      notes,
      modifiers,
    })
    onClose()
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>

        {isBundle ? (
          <p className="text-sm text-muted-foreground">Paket bundel — harga sudah termasuk semua isi.</p>
        ) : (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground">Memuat add-on...</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada varian/add-on untuk menu ini.</p>
            ) : (
              groups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {group.name}
                    {group.is_required && <span className="text-destructive"> *</span>}
                  </Label>
                  <div className="space-y-1.5">
                    {group.modifier_options
                      .filter((o) => o.is_available)
                      .map((opt) => {
                        const checked = (selected[group.id] || []).includes(opt.id)
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleOption(group.id, opt.id)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                              checked
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-4 items-center justify-center border',
                                group.selection_type === 'single' ? 'rounded-full' : 'rounded-[4px]',
                                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                              )}
                            >
                              {checked && (
                                <span className={cn('block', group.selection_type === 'single' ? 'size-2 rounded-full bg-current' : '')}>
                                  {group.selection_type === 'multiple' && <span className="text-[10px]">✓</span>}
                                </span>
                              )}
                            </span>
                            <span className="flex-1 text-left">{opt.name}</span>
                            {opt.price_delta > 0 && (
                              <span className="text-xs text-muted-foreground">+{formatRupiah(opt.price_delta)}</span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div>
          <Label>Catatan</Label>
          <Input
            placeholder="Contoh: tanpa es, pedas..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{formatRupiah(calcPrice())}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="button" onClick={handleConfirm}>Tambah ke Keranjang</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
