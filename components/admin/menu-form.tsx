'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createMenu, updateMenu } from '../../app/admin/(dashboard)/menus/actions'
import { getModifierGroupsForMenu } from '../../app/admin/(dashboard)/modifiers/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Label } from '../ui/label'
import { ImageIcon, X, Plus, Pencil } from 'lucide-react'
import { Switch } from '../ui/switch'
import { Checkbox } from '../ui/checkbox'

const menuSchema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  category_id: z.string().min(1, 'Kategori wajib'),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Harga harus angka positif'),
  description: z.string().optional(),
  is_available: z.boolean(),
})

type MenuFormValues = z.infer<typeof menuSchema>

interface MenuFormProps {
  categories: any[]
  modifierGroups: any[]
  initialData?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function MenuForm({ categories, modifierGroups, initialData, open, onOpenChange, onSuccess }: MenuFormProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialData?.image_url || null)
  const [loading, setLoading] = useState(false)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])

  const isEdit = !!initialData

  useEffect(() => {
    if (isEdit && isOpen) {
      getModifierGroupsForMenu(initialData.id).then(setSelectedModifiers)
    }
  }, [isEdit, isOpen, initialData?.id])

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: initialData?.name || '',
      category_id: initialData?.category_id || '',
      price: initialData?.price?.toString() || '',
      description: initialData?.description || '',
      is_available: initialData?.is_available ?? true,
    },
  })

  async function onSubmit(values: MenuFormValues) {
    if (image && image.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 2 MB')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('category_id', values.category_id)
      formData.append('price', values.price)
      formData.append('is_available', values.is_available.toString())
      formData.append('modifierGroupIds', JSON.stringify(selectedModifiers))
      if (values.description) formData.append('description', values.description)
      
      if (image) {
        formData.append('image', image)
      }
      
      if (isEdit && initialData.image_url) {
        formData.append('old_image_url', initialData.image_url)
      }

      if (isEdit) {
        await updateMenu(initialData.id, formData)
        toast.success('Menu berhasil diperbarui')
      } else {
        await createMenu(formData)
        toast.success('Menu berhasil ditambahkan')
      }
      
      setIsOpen(false)
      if (!isEdit) {
        form.reset()
        setImage(null)
        setPreview(null)
        setSelectedModifiers([])
      }
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || `Gagal ${isEdit ? 'memperbarui' : 'menambahkan'} menu`)
    } finally {
      setLoading(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Format hanya JPG, PNG, atau WebP')
      return
    }

    setImage(file)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isEdit && (
        <DialogTrigger
          render={
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Tambah Menu
            </Button>
          }
        />
      )}
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <DialogTitle>{isEdit ? 'Edit Menu' : 'Tambah Menu Baru'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-5 md:grid-cols-2">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Menu</FormLabel>
                      <FormControl>
                        <Input placeholder="Nasi Goreng Spesial" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <select
                          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          {...field}
                        >
                          <option value="">Pilih kategori</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 items-start gap-3">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga (Rp)</FormLabel>
                        <FormControl>
                          <Input type="number" inputMode="numeric" placeholder="35000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_available"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <div className="flex h-8 items-center justify-between gap-2 rounded-lg border border-input px-2.5">
                            <span className="text-xs text-muted-foreground">Tersedia</span>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi (opsional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Komposisi dan rasa..." rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <Label>Add-on Grup</Label>
                  <p className="mb-2 text-xs text-muted-foreground">Pilih grup add-on yang tersedia untuk menu ini</p>
                  <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                    {modifierGroups.length === 0 && <p className="p-2 text-center text-xs text-muted-foreground">Belum ada grup add-on</p>}
                    {modifierGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-muted/50">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedModifiers.includes(group.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedModifiers([...selectedModifiers, group.id])
                            else setSelectedModifiers(selectedModifiers.filter(id => id !== group.id))
                          }}
                        />
                        <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer truncate text-sm">{group.name}</Label>
                        <span className="shrink-0 text-[10px] uppercase text-muted-foreground">{group.selection_type}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Gambar Menu</Label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="menu-image-upload"
                  />
                  {preview ? (
                    <div className="relative mt-2">
                      <img src={preview} alt="Preview" className="h-40 w-full rounded-lg border object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Hapus gambar"
                        className="absolute right-2 top-2 bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => {
                          setImage(null)
                          setPreview(null)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <label
                        htmlFor="menu-image-upload"
                        className="mt-2 inline-block cursor-pointer text-xs font-medium text-primary hover:underline"
                      >
                        Ganti gambar
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="menu-image-upload"
                      className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 text-center transition-colors hover:border-ring hover:bg-muted/50"
                    >
                      <ImageIcon className="h-7 w-7 text-muted-foreground" />
                      <span className="text-xs font-medium">Upload Gambar</span>
                      <span className="text-[10px] text-muted-foreground">JPG, PNG, atau WebP &middot; maks 2 MB</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t bg-muted/30 px-6 py-3">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Menu'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}