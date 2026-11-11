'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTable, updateTable } from '../../app/admin/(dashboard)/tables/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

export function CreateTableForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createTable(name)
      toast.success('Meja berhasil ditambahkan')
      setOpen(false)
      setName('')
      router.refresh()
    } catch {
      toast.error('Gagal')
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
            Tambah Meja
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Meja Baru</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Nama Meja</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function EditTableForm({ initialData, open, onOpenChange, onSuccess }: { initialData: any; open?: boolean; onOpenChange?: (open: boolean) => void; onSuccess?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen

  const [name, setName] = useState(initialData?.name || '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateTable(initialData.id, name)
      toast.success('Meja berhasil diperbarui')
      setIsOpen(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch {
      toast.error('Gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Meja</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Nama Meja</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
