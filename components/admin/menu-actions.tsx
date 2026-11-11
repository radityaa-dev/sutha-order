'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteMenu } from '../../app/admin/(dashboard)/menus/actions'
import { MenuForm } from './menu-form'
import { toast } from 'sonner'

export function MenuActions({ menu, categories, modifierGroups, onSuccess }: any) {
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteMenu(menu.id)
      toast.success('Menu dihapus')
      setShowDelete(false)
      onSuccess()
    } catch (e) {
      toast.error('Gagal menghapus')
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
          variant: 'outline',
          onClick: () => setShowEdit(true)
        }}
        items={[
          { label: 'Hapus', icon: ActionIcons.Delete, destructive: true, onClick: () => setShowDelete(true) }
        ]}
      />

      <MenuForm
        categories={categories}
        modifierGroups={modifierGroups}
        initialData={menu}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={onSuccess}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Menu"
        description={`Yakin hapus ${menu.name}? Aksi ini tidak bisa dibatalkan.`}
        loading={loading}
      />
    </>
  )
}
