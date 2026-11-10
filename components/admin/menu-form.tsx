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
  onSuccess?: () => void
}

export function MenuForm({ categories, modifierGroups, initialData, onSuccess }: MenuFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initialData?.image_url || null)
  const [loading, setLoading] = useState(false)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])

  const isEdit = !!initialData

  useEffect(() => {
    if (isEdit && open) {
      getModifierGroupsForMenu(initialData.id).then(setSelectedModifiers)
    }
  }, [isEdit, open, initialData?.id])

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
      
      setOpen(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            {isEdit ? (
              <Pencil className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {isEdit ? 'Edit Menu' : 'Tambah Menu'}
          </Button>
        }
      />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Menu' : 'Tambah Menu Baru'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          className="w-full px-3 py-2 border rounded-md bg-background"
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga (Rp)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="35000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_available"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 mt-7 h-10">
                        <FormLabel className="text-xs">Tersedia</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="scale-75"
                          />
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

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Menu'}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Add-on Grup</Label>
              <p className="text-xs text-muted-foreground mb-2">Pilih grup add-on yang tersedia untuk menu ini</p>
              <div className="grid gap-2 border p-3 rounded-md bg-muted/20 max-h-48 overflow-y-auto">
                {modifierGroups.length === 0 && <p className="text-xs text-center p-2 text-muted-foreground">Belum ada grup add-on</p>}
                {modifierGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded transition-colors">
                    <Checkbox 
                      id={`group-${group.id}`}
                      checked={selectedModifiers.includes(group.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedModifiers([...selectedModifiers, group.id])
                        else setSelectedModifiers(selectedModifiers.filter(id => id !== group.id))
                      }}
                    />
                    <Label htmlFor={`group-${group.id}`} className="text-sm cursor-pointer flex-1">{group.name}</Label>
                    <span className="text-[10px] text-muted-foreground uppercase">{group.selection_type}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Gambar Menu</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center mt-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  id="menu-image-upload"
                />
                <label
                  htmlFor="menu-image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {preview ? (
                    <div className="relative w-full">
                      <img src={preview} alt="Preview" className="w-full max-h-40 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImage(null)
                          setPreview(null)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="text-xs font-medium">Upload Gambar</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
