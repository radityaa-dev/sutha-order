'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteTable, regenerateToken } from '../../app/admin/(dashboard)/tables/actions'
import { EditTableForm } from './table-form'
import { toast } from 'sonner'

export function TableActions({ table, onViewQR, onSuccess }: { table: any; onViewQR: () => void; onSuccess: () => void }) {
  const [showDelete, setShowDelete] = useState(false)
  const [showRegen, setShowRegen] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteTable(table.id)
      toast.success('Meja dihapus')
      setShowDelete(false)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setLoading(true)
    try {
      await regenerateToken(table.id)
      toast.success('Token meja diperbarui')
      setShowRegen(false)
      onSuccess()
    } catch (e: any) {
      toast.error(e.message || 'Gagal mereset token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <RowActions
        primary={{
          label: 'Lihat QR',
          icon: ActionIcons.ViewQR,
          onClick: onViewQR,
          variant: 'outline'
        }}
        items={[
          { label: 'Edit', icon: ActionIcons.Edit, onClick: () => setShowEdit(true) },
          { label: 'Regenerate Token', icon: ActionIcons.Regenerate, destructive: true, onClick: () => setShowRegen(true) },
          { label: 'Hapus', icon: ActionIcons.Delete, destructive: true, onClick: () => setShowDelete(true) }
        ]}
      />

      <EditTableForm initialData={table} open={showEdit} onOpenChange={setShowEdit} onSuccess={onSuccess} />

      <ConfirmDialog
        open={showRegen}
        onOpenChange={setShowRegen}
        onConfirm={handleRegenerate}
        title="Regenerate Token Meja"
        description={`Token meja ${table.name} akan diganti. QR Code lama HARUS dicetak ulang.`}
        loading={loading}
        confirmText="Regenerate"
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Meja"
        description={`Yakin hapus ${table.name}?`}
        loading={loading}
      />
    </>
  )
}
