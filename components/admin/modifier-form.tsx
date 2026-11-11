'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createModifierGroup, updateModifierGroup } from '../../app/admin/(dashboard)/modifiers/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '../ui/label'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Switch } from '../ui/switch'

const modifierSchema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  selection_type: z.enum(['single', 'multiple']),
  is_required: z.boolean().default(false),
  min_select: z.number().min(0).default(0),
  max_select: z.number().nullable().default(null),
  options: z.array(z.object({
    name: z.string().min(1, 'Nama opsi wajib'),
    price_delta: z.number().min(0, 'Harga tidak boleh negatif'),
    is_available: z.boolean().default(true),
    sort_order: z.number().default(0),
  })).min(1, 'Minimal 1 opsi'),
}).refine((data) => {
  if (data.selection_type === 'single') {
    return (data.max_select === null || data.max_select === 1) && data.min_select <= 1
  }
  return true
}, {
  message: "Tipe tunggal maksimal 1 pilihan",
  path: ["max_select"]
}).refine((data) => {
  if (data.is_required && data.min_select < 1) return false
  return true
}, {
  message: "Jika wajib, minimal harus 1",
  path: ["min_select"]
}).refine((data) => {
  return data.min_select <= data.options.length
}, {
  message: "Minimal pilih tidak boleh melebihi jumlah opsi",
  path: ["min_select"]
})

type ModifierFormValues = z.infer<typeof modifierSchema>

export function ModifierGroupForm({ initialData, open, onOpenChange, onSuccess }: { initialData?: any; open?: boolean; onOpenChange?: (open: boolean) => void; onSuccess?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isEdit = !!initialData

  const form = useForm<ModifierFormValues>({
    resolver: zodResolver(modifierSchema) as any,
    defaultValues: {
      name: initialData?.name || '',
      selection_type: initialData?.selection_type || 'single',
      is_required: initialData?.is_required || false,
      min_select: initialData?.min_select || 0,
      max_select: initialData?.max_select || null,
      options: initialData?.modifier_options?.map((o: any) => ({
        name: o.name,
        price_delta: o.price_delta,
        is_available: o.is_available,
        sort_order: o.sort_order,
      })) || [{ name: '', price_delta: 0, is_available: true, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  })

  async function onSubmit(values: ModifierFormValues) {
    setLoading(true)
    try {
      if (values.selection_type === 'single') {
        values.max_select = 1
        if (values.is_required) values.min_select = 1
      }

      if (isEdit) {
        await updateModifierGroup(initialData.id, values)
        toast.success('Grup add-on diperbarui')
      } else {
        await createModifierGroup(values)
        toast.success('Grup add-on ditambahkan')
      }
      setIsOpen(false)
      if (!isEdit) form.reset()
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
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
              Tambah Add-on
            </Button>
          }
        />
      )}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Grup Add-on' : 'Tambah Grup Add-on Baru'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Grup</FormLabel>
                    <FormControl><Input placeholder="Level Pedas, Topping..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selection_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipe Pilihan</FormLabel>
                    <FormControl>
                      <select className="w-full p-2 border rounded-md bg-background" {...field}>
                        <option value="single">Satu Pilihan (Radio)</option>
                        <option value="multiple">Banyak Pilihan (Checkbox)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-8 p-4 border rounded-lg bg-muted/30">
              <FormField
                control={form.control}
                name="is_required"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel>Wajib diisi?</FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('selection_type') === 'multiple' && (
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="min_select"
                    render={({ field }) => (
                      <FormItem className="space-y-0 flex items-center gap-2">
                        <FormLabel className="text-xs whitespace-nowrap">Min</FormLabel>
                        <FormControl><Input type="number" className="w-16 h-8" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_select"
                    render={({ field }) => (
                      <FormItem className="space-y-0 flex items-center gap-2">
                        <FormLabel className="text-xs whitespace-nowrap">Max (null = bebas)</FormLabel>
                        <FormControl><Input type="number" className="w-16 h-8" value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Daftar Opsi</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', price_delta: 0, is_available: true, sort_order: fields.length })}>
                  <Plus className="w-4 h-4 mr-1" /> Opsi
                </Button>
              </div>
              
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md group">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <FormField
                      control={form.control}
                      name={`options.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl><Input placeholder="Nama opsi..." className="h-8" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.price_delta`}
                      render={({ field }) => (
                        <FormItem className="w-28 space-y-0">
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground">Rp</span>
                              <Input type="number" className="h-8 pl-6" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`options.${index}.is_available`}
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)} disabled={fields.length === 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.formState.errors.options?.root && <p className="text-xs text-destructive">{form.formState.errors.options.root.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Grup Add-on'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
