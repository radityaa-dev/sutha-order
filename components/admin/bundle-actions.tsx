'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteBundle } from '../../app/dashboard/(dashboard)/bundles/actions'
import { BundleForm } from './bundle-form'
import { toast } from 'sonner'

export function BundleActions({ bundle, onSuccess }: { bundle: any; onSuccess: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteBundle(bundle.id)
      toast.success('Paket dihapus')
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

      <BundleForm initialData={bundle} open={showEdit} onOpenChange={setShowEdit} onSuccess={onSuccess} />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Paket"
        description={`Yakin hapus paket ${bundle.name}?`}
        loading={loading}
      />
    </>
  )
}