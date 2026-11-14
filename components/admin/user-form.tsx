'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateUser, setPin } from '../../app/dashboard/(dashboard)/users/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Switch } from '../ui/switch'

const createSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['admin', 'kasir', 'dapur', 'stakeholder']),
})

const editSchema = z.object({
  full_name: z.string().min(1, 'Nama wajib'),
  role: z.enum(['admin', 'kasir', 'dapur', 'stakeholder']),
})

const pinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN harus 6 digit angka'),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

export function CreateUserForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { full_name: '', email: '', password: '', role: 'kasir' },
  })

  async function onSubmit(values: CreateValues) {
    setLoading(true)
    try {
      await createUser(values)
      toast.success('Akun staf ditambahkan')
      setOpen(false)
      form.reset()
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
            Tambah Staf
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Akun Staf</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="staf@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" placeholder="min 6 karakter" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <select className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-sm" {...field}>
                    <option value="kasir">Kasir</option>
                    <option value="dapur">Dapur</option>
                    <option value="admin">Admin</option>
                    <option value="stakeholder">Stakeholder</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function EditUserForm({ initialData, open, onOpenChange, onSuccess }: { initialData: any; open: boolean; onOpenChange: (o: boolean) => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { full_name: initialData.full_name, role: initialData.role },
  })

  const pinForm = useForm({ resolver: zodResolver(pinSchema), defaultValues: { pin: '' } })

  async function onSubmit(values: EditValues) {
    setLoading(true)
    try {
      await updateUser(initialData.id, values)
      toast.success('Akun diperbarui')
      onOpenChange(false)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message || 'Gagal memperbarui')
    } finally {
      setLoading(false)
    }
  }

  async function onSetPin(values: { pin: string }) {
    setPinLoading(true)
    try {
      await setPin(initialData.id, values.pin)
      toast.success('PIN admin diperbarui')
      pinForm.reset()
      setPinOpen(false)
    } catch (e: any) {
      toast.error(e.message || 'Gagal set PIN')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Akun Staf</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <FormControl>
                  <select className="w-full h-8 px-2.5 rounded-lg border border-input bg-background text-sm" {...field}>
                    <option value="kasir">Kasir</option>
                    <option value="dapur">Dapur</option>
                    <option value="admin">Admin</option>
                    <option value="stakeholder">Stakeholder</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {initialData.role === 'admin' && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">PIN Otorisasi</p>
                  <p className="text-xs text-muted-foreground">PIN 6 digit untuk diskon & void</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setPinOpen(true)}>Set PIN</Button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
            </div>
          </form>
        </Form>

        {/* Dialog PIN (nested) */}
        <Dialog open={pinOpen} onOpenChange={setPinOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Set PIN Admin</DialogTitle>
            </DialogHeader>
            <Form {...pinForm}>
              <form onSubmit={pinForm.handleSubmit(onSetPin)} className="space-y-4">
                <FormField control={pinForm.control} name="pin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN 6 Digit</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setPinOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={pinLoading}>{pinLoading ? 'Menyimpan...' : 'Simpan PIN'}</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export function ToggleActive({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function toggle() {
    setLoading(true)
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      toast.success('Status diperbarui')
      onSuccess()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Switch
      checked={user.is_active}
      onCheckedChange={toggle}
      disabled={loading}
    />
  )
}
