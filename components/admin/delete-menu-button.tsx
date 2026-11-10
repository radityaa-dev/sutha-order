'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
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
import { deleteMenu } from '../../app/admin/(dashboard)/menus/actions'
import { toast } from 'sonner'

export function DeleteMenuButton({ id, name, onDelete, trigger }: { id: string; name: string; onDelete: () => void; trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteMenu(id)
      onDelete()
      toast.success('Menu dihapus')
      setOpen(false)
    } catch {
      toast.error('Gagal hapus menu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <AlertDialogTrigger
          render={trigger}
        />
      ) : (
        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOpen(true)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Menu?</AlertDialogTitle>
          <AlertDialogDescription>Menu "{name}" akan dihapus permanen.</AlertDialogDescription>
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
