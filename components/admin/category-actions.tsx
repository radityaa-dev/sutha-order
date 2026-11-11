'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { deleteCategory } from '../../app/admin/(dashboard)/categories/actions'
import { EditCategoryForm } from './category-form'
import { toast } from 'sonner'

export function CategoryActions({ category }: { category: any }) {
  const router = useRouter()
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteCategory(category.id)
      toast.success('Kategori dihapus')
      router.refresh()
      setShowDelete(false)
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

      <EditCategoryForm
        initialData={category}
        open={showEdit}
        onOpenChange={setShowEdit}
        onSuccess={() => { router.refresh(); setShowEdit(false) }}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        description={`Yakin hapus kategori ${category.name}?`}
        loading={loading}
      />
    </>
  )
}