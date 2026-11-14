'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBundle, updateBundle, getMenusForBundle } from '../../app/dashboard/(dashboard)/bundles/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, X } from 'lucide-react'
import { Label } from '../ui/label'

const bundleSchema = z.object({
  name: z.string().min(1, 'Nama paket wajib'),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Harga harus angka positif'),
  items: z.array(z.object({
    menu_id: z.string().min(1, 'Pilih menu'),
    qty: z.number().int().min(1, 'Minimal 1'),
  })).min(1, 'Minimal 1 item dalam paket'),
})

type BundleFormValues = z.infer<typeof bundleSchema>

interface BundleFormProps {
  onSuccess: () => void
  initialData?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function BundleForm({ onSuccess, initialData, open, onOpenChange }: BundleFormProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [menus, setMenus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const isEdit = !!initialData

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price?.toString() || '',
      items: initialData?.bundle_items?.map((bi: any) => ({
        menu_id: bi.menu_id,
        qty: bi.qty,
      })) || [{ menu_id: '', qty: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  useEffect(() => {
    getMenusForBundle().then(setMenus).catch(() => toast.error('Gagal memuat menu'))
  }, [])

  async function onSubmit(values: BundleFormValues) {
    setLoading(true)
    try {
      if (isEdit) {
        await updateBundle(initialData.id, {
          name: values.name,
          description: values.description,
          price: Number(values.price),
          items: values.items,
        })
        toast.success('Paket diperbarui')
      } else {
        await createBundle({
          name: values.name,
          description: values.description,
          price: Number(values.price),
          items: values.items,
        })
        toast.success('Paket ditambahkan')
      }
      setIsOpen(false)
      if (!isEdit) form.reset({ name: '', description: '', price: '', items: [{ menu_id: '', qty: 1 }] })
      onSuccess()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || `Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} paket`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEdit && (
        <DialogTrigger
          render={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Paket
            </Button>
          }
        />
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Paket' : 'Tambah Paket Baru'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Paket</FormLabel>
                  <FormControl><Input placeholder="Nasi Goreng + Es Teh" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi (opsional)</FormLabel>
                  <FormControl><Textarea placeholder="Paket hemat siang" rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga Paket (Rp)</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" placeholder="35000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Item Paket</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ menu_id: '', qty: 1 })}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Item
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 p-2 border rounded">
                    <FormField
                      control={form.control}
                      name={`items.${index}.menu_id`}
                      render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl>
                            <select className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none" {...field}>
                              <option value="">Pilih menu</option>
                              {menus.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name} — {m.price.toLocaleString('id-ID')}</option>
                              ))}
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.qty`}
                      render={({ field }) => (
                        <FormItem className="w-20 space-y-0">
                          <FormControl>
                            <Input type="number" min={1} className="h-8" {...field} onChange={e => field.onChange(Number(e.target.value) || 1)} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Paket'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}