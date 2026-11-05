'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTable } from '../../app/admin/tables/actions'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { toast } from 'sonner'

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
      <Button size="sm" onClick={() => setOpen(true)}>Tambah Meja</Button>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Meja Baru</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Label>Nama Meja</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
          <Button type="submit" disabled={loading}>Simpan</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
