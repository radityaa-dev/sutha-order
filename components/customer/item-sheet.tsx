'use client'

import { useState, useMemo } from 'react'
import { useCartStore } from '../../lib/store'
import { Button } from '../ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { formatRupiah } from '../../lib/format'
import { Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'

export function ItemSheet({ menu, children }: { menu: any, children: React.ReactElement }) {
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const addItem = useCartStore(state => state.addItem)

  // Hitung total harga
  const basePrice = menu.price
  const addonPrice = useMemo(() => {
    let total = 0
    menu.modifier_groups.forEach((g: any) => {
      const selectedIds = selections[g.id] || []
      selectedIds.forEach(optId => {
        const opt = g.options.find((o: any) => o.id === optId)
        if (opt) total += opt.price_delta
      })
    })
    return total
  }, [menu, selections])

  const total = (basePrice + addonPrice) * qty

  const missingRequired = useMemo(() => {
    return menu.modifier_groups.filter((g: any) => {
      if (!g.is_required) return false
      const selected = selections[g.id] || []
      return selected.length < (g.min_select || 1)
    })
  }, [menu, selections])

  function handleSelect(groupId: string, optionId: string, type: string) {
    setErrors(prev => ({ ...prev, [groupId]: false }))
    setSelections(prev => {
      const current = prev[groupId] || []
      const group = menu.modifier_groups.find((g: any) => g.id === groupId)
      
      if (type === 'single') return { ...prev, [groupId]: [optionId] }
      
      // Multiple
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter(id => id !== optionId) }
      if (group.max_select && current.length >= group.max_select) {
        toast.error(`Maksimal ${group.max_select} pilihan`)
        return prev
      }
      return { ...prev, [groupId]: [...current, optionId] }
    })
  }

  function handleAdd() {
    if (missingRequired.length > 0) {
      const firstMissing = missingRequired[0]
      setErrors(prev => ({ ...prev, [firstMissing.id]: true }))
      const el = document.getElementById(`group-${firstMissing.id}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const firstInput = el?.querySelector('input')
      firstInput?.focus({ preventScroll: true })
      el?.classList.add('border', 'border-destructive', 'p-2', 'rounded-lg')
      setTimeout(() => el?.classList.remove('border', 'border-destructive', 'p-2', 'rounded-lg'), 2000)
      toast.error(`Lengkapi pilihan wajib: ${firstMissing.name}`)
      return
    }
    
    // Format add-ons untuk keranjang
    const selectedOptions = menu.modifier_groups.flatMap((g: any) => {
      const ids = selections[g.id] || []
      return ids.map(id => {
        const opt = g.options.find((o: any) => o.id === id)
        return { group_name: g.name, option_name: opt.name, price_delta: opt.price_delta, option_id: opt.id }
      })
    })

    addItem({
      id: menu.id,
      name: menu.name,
      price: basePrice + addonPrice,
      qty,
      notes,
      modifiers: selectedOptions,
      base_price: basePrice
    })
    toast.success('Ditambahkan ke keranjang')
  }

  return (
    <Drawer modal={true}>
      <DrawerTrigger render={children} />
      <DrawerContent className="p-4 flex flex-col h-[90vh]">
        <div className="flex-1 overflow-y-auto space-y-4">
          {menu.image_url && <img src={menu.image_url} className="w-full h-48 object-cover rounded-lg" alt={menu.name} />}
          <div>
            <h2 className="text-xl font-bold">{menu.name}</h2>
            <p className="text-muted-foreground">{menu.description}</p>
            <p className="font-bold text-lg">{formatRupiah(basePrice)}</p>
          </div>

          {menu.modifier_groups.map((g: any) => {
            const hasError = errors[g.id]
            return (
              <div key={g.id} id={`group-${g.id}`} className="space-y-2 transition-colors duration-300">
                <div className="flex justify-between items-center">
                  <Label className="font-bold">
                    {g.name} {g.is_required && <span className="text-destructive">*</span>}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {g.selection_type === 'single' ? 'Pilih 1' : `Pilih ${g.min_select || 0}-${g.max_select || 'bebas'}`}
                  </span>
                </div>
                {hasError && <p className="text-xs text-destructive font-semibold" aria-live="polite">Pilih 1 opsi</p>}
                
                {g.selection_type === 'single' ? (
                  <RadioGroup aria-invalid={hasError} value={selections[g.id]?.[0]} onValueChange={(val) => handleSelect(g.id, val, 'single')}>
                    {g.options.map((opt: any) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.id} id={opt.id} />
                        <Label htmlFor={opt.id} className="flex-1 flex justify-between cursor-pointer">
                          {opt.name} {opt.price_delta > 0 && <span className="text-xs text-muted-foreground">+ {formatRupiah(opt.price_delta)}</span>}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2" aria-invalid={hasError}>
                    {g.options.map((opt: any) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <Checkbox 
                          checked={selections[g.id]?.includes(opt.id)} 
                          onCheckedChange={() => handleSelect(g.id, opt.id, 'multiple')}
                          id={opt.id}
                        />
                        <Label htmlFor={opt.id} className="flex-1 flex justify-between cursor-pointer">
                          {opt.name} {opt.price_delta > 0 && <span className="text-xs text-muted-foreground">+ {formatRupiah(opt.price_delta)}</span>}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 200))} placeholder="Contoh: Tanpa bawang" maxLength={200} />
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="flex justify-center items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}><Minus/></Button>
            <span className="w-8 text-center font-bold">{qty}</span>
            <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)}><Plus/></Button>
          </div>
          <Button className="w-full" size="lg" onClick={handleAdd}>
            Tambah - {formatRupiah(total)}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}