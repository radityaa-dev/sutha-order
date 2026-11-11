'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteModifierGroup } from '../../app/admin/(dashboard)/modifiers/actions'
import { ModifierGroupForm } from './modifier-form'
import { toast } from 'sonner'

export function ModifierActions({ group, onSuccess }: { group: any; onSuccess: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteModifierGroup(group.id)
      toast.success('Grup add-on dihapus')
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
          variant: 'outline'
        }}
        items={[
          { label: 'Hapus', icon: ActionIcons.Delete, destructive: true, onClick: () => setShowDelete(true) }
        ]}
      />

      <ModifierGroupForm initialData={group} open={showEdit} onOpenChange={setShowEdit} onSuccess={onSuccess} />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Grup Add-on"
        description={`Yakin hapus grup ${group.name}?`}
        loading={loading}
      />
    </>
  )
}