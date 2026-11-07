'use client'

import { useEffect, useState } from 'react'
import { adminClient } from '../../../lib/supabase/admin'
import { formatRupiah } from '../../../lib/format'
import { PayButton } from '../../../components/customer/pay-button'

export default function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { code } = await params

  async function fetchOrder() {
    const { data } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_code', code)
      .single()
    setOrder(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 5000)
    return () => clearInterval(interval)
  }, [code])

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-background p-4 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
        <div className="h-10 bg-muted rounded" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-xl font-bold">Pesanan Tidak Ditemukan</h1>
        <p className="text-muted-foreground mt-2">Kode pesanan tidak valid.</p>
      </div>
    )
  }

  const isPaid = order.payment_status === 'paid'
  const statusLabel: Record<string, string> = {
    pending: 'Menunggu Pembayaran',
    paid: 'Lunas',
    expired: 'Kedaluwarsa',
    failed: 'Gagal',
  }

  const orderStatusSteps = ['paid', 'preparing', 'ready', 'completed']
  const currentStep = orderStatusSteps.indexOf(order.order_status)

  return (
    <div className="max-w-md mx-auto min-h-screen bg-background p-4 space-y-6">
      <header className="text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Sutha Corner</h1>
        <p className="text-sm text-muted-foreground mt-1">Pesanan {order.order_code}</p>
      </header>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Nama</span>
          <span className="font-medium">{order.customer_name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status Pembayaran</span>
          <span className={`font-medium ${isPaid ? 'text-green-600' : 'text-orange-500'}`}>
            {statusLabel[order.payment_status] || order.payment_status}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Status Pesanan</span>
          <span className="font-medium capitalize">{order.order_status}</span>
        </div>
      </div>

      {/* Order Progress Stepper */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Proses Pesanan</h2>
        <div className="flex items-center justify-between">
          {orderStatusSteps.map((step, index) => {
            const isActive = index <= currentStep
            const isCurrent = index === currentStep
            return (
              <div key={step} className="flex flex-col items-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                <p className={`mt-1 text-xs text-center w-24 ${
                  isActive ? 'font-medium text-primary' : 'text-muted-foreground'
                }`}>
                  {step === 'paid' && 'Dibayar'}
                  {step === 'preparing' && 'Dimasak'}
                  {step === 'ready' && 'Siap'}
                  {step === 'completed' && 'Selesai'}
                </p>
                {index < orderStatusSteps.length - 1 && (
                  <div className={`absolute top-4 left-[calc(50%+16px)] w-full h-1 ${
                    isActive ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Ready Banner */}
      {order.order_status === 'ready' && (
        <div className="bg-green-500 text-white p-4 rounded-lg text-center animate-pulse">
          <p className="font-bold text-lg">Pesananmu sudah siap!</p>
          <p className="text-sm opacity-90">Silakan ambil di kasir</p>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold">Detail Pesanan</h2>
        {order.order_items.map((item: { id: string; menu_name: string; qty: number; price: number; notes?: string }) => (
          <div key={item.id} className="flex justify-between text-sm">
            <div>
              <span>{item.qty}x {item.menu_name}</span>
              {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
            </div>
            <span>{formatRupiah(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>{formatRupiah(order.total)}</span>
        </div>
      </div>

      {!isPaid && order.payment_status === 'pending' && (
        <PayButton orderCode={order.order_code} />
      )}

      {isPaid && order.order_status === 'completed' && (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-green-700 font-medium">Pesanan selesai</p>
          <p className="text-sm text-muted-foreground mt-1">Terima kasih telah memesan</p>
        </div>
      )}
    </div>
  )
}