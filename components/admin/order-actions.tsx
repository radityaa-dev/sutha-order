'use client'

import { useState } from 'react'
import { RowActions } from './row-actions'
import { ConfirmDialog } from './confirm-dialog'
import { ActionIcons } from './action-icons'
import { toast } from 'sonner'

export function OrderActions({ order, onAction }: { order: any; onAction: (order: any, status: string) => void }) {
  const [showCancel, setShowCancel] = useState(false)
  const [loading, setLoading] = useState(false)

  const getNextAction = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Mulai Dikerjakan', next: 'preparing', icon: ActionIcons.StartCooking }
      case 'preparing': return { label: 'Menu Selesai', next: 'ready', icon: ActionIcons.FinishCooking }
      case 'ready': return { label: 'Pesanan Selesai', next: 'completed', icon: ActionIcons.CompleteOrder }
      default: return null
    }
  }

  const action = getNextAction(order.order_status)

  function handleCancel() {
    setLoading(true)
    onAction(order, 'cancelled')
    setShowCancel(false)
    setLoading(false)
  }

  return (
    <>
      <RowActions
        primary={action ? {
          label: action.label,
          icon: action.icon,
          onClick: () => onAction(order, action.next),
          variant: 'default'
        } : undefined}
        items={[
          { label: 'Lihat Detail', icon: ActionIcons.Detail, onClick: () => {} },
          ...(['paid', 'preparing'].includes(order.order_status) ? [{
            label: 'Batalkan Order',
            icon: ActionIcons.Cancel,
            destructive: true,
            onClick: () => setShowCancel(true)
          }] : [])
        ]}
      />

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        onConfirm={handleCancel}
        title="Batalkan Order"
        description={`Yakin batalkan order ${order.order_code}?`}
        loading={loading}
      />
    </>
  )
}
