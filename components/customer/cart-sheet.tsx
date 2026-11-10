'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '../../lib/store'
import { formatRupiah } from '../../lib/format'
import { Button } from '../../components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function CartSheet({ token }: { token: string }) {
  const { items, updateQty, removeItem, clearCart } = useCartStore()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = items.reduce((sum, i) => sum + i.qty, 0)

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (!name) return toast.error('Nama wajib diisi')
    if (items.length === 0) return toast.error('Keranjang kosong')

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name,
          notes,
          items: items.map(i => ({
            menuId: i.id,
            qty: i.qty,
            notes: i.notes || '',
            optionIds: i.modifiers.map(m => m.option_id) // Kirim optionIds ke server
          }))
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal checkout')

      clearCart()
      setOpen(false)
      router.push(`/order/${data.access_token}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (count === 0) return null

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50">
        <Button onClick={() => setOpen(true)} className="w-full flex justify-between py-6 shadow-lg text-lg">
          <span className="flex items-center gap-2"><ShoppingCart /> {count} item</span>
          <span>{formatRupiah(total)}</span>
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Keranjang Pesanan</SheetTitle></SheetHeader>
          <div className="space-y-4 my-4">
            {items.map((i) => (
              <div key={i.lineId} className="flex justify-between items-start border-b pb-3 gap-2">
                <div className="flex-1">
                  <h4 className="font-medium">{i.name}</h4>
                  {i.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {i.modifiers.map(m => m.option_name).join(', ')}
                    </p>
                  )}
                  {i.notes && <p className="text-xs italic text-muted-foreground">Catatan: {i.notes}</p>}
                  <p className="text-xs font-semibold mt-1">{formatRupiah(i.price)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.lineId, -1)}><Minus className="w-3 h-3"/></Button>
                  <span className="text-sm font-medium">{i.qty}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.lineId, 1)}><Plus className="w-3 h-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(i.lineId)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>
            ))}

            <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Nama Pemesan</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Nama Anda" />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan Umum</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: Jangan pakai es" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Memproses...' : `Pesan Sekarang (${formatRupiah(total)})`}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
