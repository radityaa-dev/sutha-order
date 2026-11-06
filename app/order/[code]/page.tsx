import { adminClient } from '../../../lib/supabase/admin'
import { formatRupiah } from '../../../lib/format'
import { PayButton } from '../../../components/customer/pay-button'

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const { data: order } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_code', code)
    .single()

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

      {isPaid && (
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-green-700 font-medium">Pembayaran berhasil</p>
          <p className="text-sm text-muted-foreground mt-1">Pesanan sedang diproses</p>
        </div>
      )}
    </div>
  )
}
