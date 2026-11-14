'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createExpense, updateExpense, deleteExpense } from '../../app/dashboard/(dashboard)/expenses/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'

const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Tanggal wajib'),
  category: z.string().min(1, 'Kategori wajib'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Nominal harus angka positif'),
  description: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

const expenseCategories = [
  'Bahan Baku',
  'Gaji & Upah',
  'Sewa & Utilitas',
  'Pemasaran',
  'Peralatan',
  'Perawatan',
  'Lain-lain',
]

export function CreateExpenseForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: new Date().toISOString().slice(0, 10),
      category: '',
      amount: '',
      description: '',
    },
  })

  async function onSubmit(values: ExpenseFormValues) {
    setLoading(true)
    try {
      await createExpense({
        expense_date: values.expense_date,
        category: values.category,
        amount: Number(values.amount),
        description: values.description,
      })
      toast.success('Pengeluaran ditambahkan')
      setOpen(false)
      form.reset({ expense_date: new Date().toISOString().slice(0, 10), category: '', amount: '', description: '' })
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menambahkan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengeluaran
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pengeluaran</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <FormControl>
                    <select className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none" {...field}>
                      <option value="">Pilih kategori</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nominal (Rp)</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" placeholder="50000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (opsional)</FormLabel>
                  <FormControl><Textarea placeholder="Detail pengeluaran..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface EditExpenseFormProps {
  initialData: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditExpenseForm({ initialData, open, onOpenChange, onSuccess }: EditExpenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: initialData?.expense_date || '',
      category: initialData?.category || '',
      amount: initialData?.amount?.toString() || '',
      description: initialData?.description || '',
    },
  })

  async function onSubmit(values: ExpenseFormValues) {
    setLoading(true)
    try {
      await updateExpense(initialData.id, {
        expense_date: values.expense_date,
        category: values.category,
        amount: Number(values.amount),
        description: values.description,
      })
      toast.success('Pengeluaran diperbarui')
      onOpenChange(false)
      onSuccess()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memperbarui')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pengeluaran</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="expense_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <FormControl>
                    <select className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none" {...field}>
                      <option value="">Pilih kategori</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nominal (Rp)</FormLabel>
                  <FormControl><Input type="number" inputMode="numeric" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan (opsional)</FormLabel>
                  <FormControl><Textarea placeholder="Detail pengeluaran..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function ExpenseActions({ expense, onSuccess }: { expense: any; onSuccess: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteExpense(expense.id)
      toast.success('Pengeluaran dihapus')
      setShowDelete(false)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <RowActions
        primary={{
          label: 'Edit',
          icon: ActionIcons.Edit,
          onClick: () => setShowEdit(true),
          variant: 'outline',
        }}
        items={[
          { label: 'Hapus', icon: ActionIcons.Delete, destructive: true, onClick: () => setShowDelete(true) },
        ]}
      />

      <EditExpenseForm initialData={expense} open={showEdit} onOpenChange={setShowEdit} onSuccess={onSuccess} />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Pengeluaran"
        description={`Yakin hapus pengeluaran ${expense.category} (${expense.amount.toLocaleString('id-ID')})?`}
        loading={loading}
      />
    </>
  )
}