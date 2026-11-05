'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, deleteCategory } from '../../app/admin/categories/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, Plus, Pencil } from 'lucide-react'

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib'),
})

type CategoryFormValues = z.infer<typeof categorySchema>

export function CategoryForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    },
  })

  async function onSubmit(values: CategoryFormValues) {
    setLoading(true)
    try {
      await createCategory(values)
      toast.success('Kategori berhasil ditambahkan')
      setOpen(false)
      form.reset()
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan kategori')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Tambah Kategori
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Kategori Baru</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Kategori</FormLabel>
                  <FormControl>
                    <Input placeholder="Makanan, Minuman, Snack..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteCategoryButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteCategory(id)
      toast.success('Kategori dihapus')
      setAlertOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Gagal hapus kategori')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-destructive"
        onClick={() => setAlertOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
          <AlertDialogDescription>
            Kategori "{name}" akan dihapus. Pastikan tidak ada menu di kategori ini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? 'Menghapus...' : 'Hapus'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
