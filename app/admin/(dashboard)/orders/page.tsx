'use client'

import { useEffect, useState } from 'react'
import { supabaseRealtime } from '../../../../lib/supabase/client'
import { toast } from 'sonner'
import { Badge } from '../../../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs'
import { updateOrderStatus } from './actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { OrderActions } from '../../../../components/admin/order-actions'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])

  async function fetchOrders() {
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    if (res.ok) setOrders(data)
  }

  useEffect(() => {
    fetchOrders()
    const channel = supabaseRealtime
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabaseRealtime.removeChannel(channel) }
  }, [])

  const handleStatusChange = async (order: any, nextStatus: string) => {
    try {
      await updateOrderStatus(order.id, order.order_status, nextStatus)
      toast.success('Status berhasil diubah')
      fetchOrders()
    } catch (err: any) {
      toast.error(err.message)
      fetchOrders()
    }
  }

  const activeOrders = orders.filter(o => o.payment_status === 'paid' && !['completed', 'cancelled'].includes(o.order_status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kelola Order</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Antrean Dapur ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="all">Semua Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <OrderTable orders={activeOrders} onAction={handleStatusChange} />
        </TabsContent>
        <TabsContent value="all">
          <OrderTable orders={orders} onAction={handleStatusChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrderTable({ orders, onAction }: { orders: any[], onAction: (order: any, status: string) => void }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px whitespace-nowrap text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{new Date(order.created_at).toLocaleTimeString()}</TableCell>
                <TableCell className="font-medium">{order.order_code}</TableCell>
                <TableCell>{order.customer_name}</TableCell>
                <TableCell>Rp {order.total?.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline">{order.order_status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <OrderActions order={order} onAction={onAction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
