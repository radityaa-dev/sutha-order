'use client'

import { useEffect, useState } from 'react'
import { formatRupiah } from '../../lib/format'
import { PayButton } from './pay-button'
import { Order } from '../../lib/types'

export default function OrderStatusClient({ code, initialOrder }: { code: string, initialOrder: Order }) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${code}`)
        if (!res.ok) return
        const data = await res.json()
        setOrder(data)
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [code])

  const isPaid = order.payment_status === 'paid'
  const orderStatusSteps = ['paid', 'preparing', 'ready', 'completed']
  const currentStep = orderStatusSteps.indexOf(order.order_status)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background p-4 space-y-6">
      <header className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Sutha Corner</h1>
        <p className="text-sm text-muted-foreground mt-1">Pesanan {order.order_code}</p>
      </header>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Meja</span>
          <span className="font-medium">{order.tables?.name || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status Bayar</span>
          <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-orange-500'}`}>
            {order.payment_status}
          </span>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold text-sm">Proses Pesanan</h2>
        <div className="flex items-center justify-between relative">
          {orderStatusSteps.map((step, index) => (
            <div key={step} className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
            </div>
          ))}
          <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-0" />
          <div 
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 -z-0"
            style={{ width: `${currentStep >= 0 ? (currentStep / (orderStatusSteps.length - 1)) * 100 : 0}%` }}
          />
        </div>
      </div>

      {order.order_status === 'ready' && (
        <div className="bg-green-600 text-white p-4 rounded-lg text-center shadow-lg animate-bounce">
          <p className="font-bold">Pesananmu SIAP!</p>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-3 text-sm">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.qty}x {item.menu_name}</span>
            <span>{formatRupiah(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-bold text-base">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
      </div>

      {!isPaid && order.payment_status === 'pending' && <PayButton orderCode={order.order_code} />}
    </div>
  )
}
