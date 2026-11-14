'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteUser } from '../../app/dashboard/(dashboard)/users/actions'
import { EditUserForm } from './user-form'
import { toast } from 'sonner'

export function UserActions({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteUser(user.id)
      toast.success('Akun staf dihapus')
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

      <EditUserForm initialData={user} open={showEdit} onOpenChange={setShowEdit} onSuccess={onSuccess} />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Akun Staf"
        description={`Yakin hapus akun ${user.full_name}?`}
        loading={loading}
      />
    </>
  )
}
