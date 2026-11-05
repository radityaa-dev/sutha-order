'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createMenu } from '../../app/admin/menus/actions'
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
import { ImageIcon, X } from 'lucide-react'

const menuSchema = z.object({
  name: z.string().min(1, 'Nama wajib'),
  category_id: z.string().min(1, 'Kategori wajib'),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Harga harus angka positif'),
  description: z.string().optional(),
})

type MenuFormValues = z.infer<typeof menuSchema>

export function MenuForm({ categories }: { categories: any[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      name: '',
      category_id: '',
      price: '',
      description: '',
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
      if (values.description) formData.append('description', values.description)
      if (image) formData.append('image', image)

      await createMenu(formData)
      toast.success('Menu berhasil ditambahkan')
      setOpen(false)
      form.reset()
      setImage(null)
      setPreview(null)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan menu')
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
      <Button size="sm" onClick={() => setOpen(true)}>
        <ImageIcon className="w-4 h-4 mr-2" />
        Tambah Menu
      </Button>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Menu Baru</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
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
                          className="w-full px-3 py-2 border rounded-md"
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
                  {loading ? 'Menyimpan...' : 'Simpan Menu'}
                </Button>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Gambar Menu</Label>
              <p className="text-sm text-muted-foreground mb-2">JPG/PNG/WebP maks 2 MB</p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
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
                    <div className="relative">
                      <img src={preview} alt="Preview" className="w-full max-h-60 object-cover rounded" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setImage(null)
                          setPreview(null)
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      <span className="text-sm font-medium">Klik untuk upload</span>
                      <span className="text-xs text-muted-foreground">atau drag file ke sini</span>
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
