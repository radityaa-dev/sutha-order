'use client'

import { useEffect, useState } from 'react'
import { supabaseRealtime } from '../../../lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchOrders() {
    const res = await fetch('/api/admin/orders')
    const data = await res.json()
    if (res.ok) setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    const channel = supabaseRealtime
      .channel('orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        toast.info('Order baru masuk!')
        fetchOrders()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabaseRealtime.removeChannel(channel) }
  }, [])

  const activeOrders = orders.filter(o => o.payment_status === 'paid' && o.order_status !== 'completed' && o.order_status !== 'cancelled')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kelola Order</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Antrean Dapur ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="all">Semua Riwayat</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <OrderTable orders={activeOrders} />
        </TabsContent>
        <TabsContent value="all">
          <OrderTable orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OrderTable({ orders }: { orders: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-blue-500'
      case 'preparing': return 'bg-yellow-500'
      case 'ready': return 'bg-orange-500'
      case 'completed': return 'bg-green-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead>Meja</TableHead>
            <TableHead>Pelanggan</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.order_code}</TableCell>
              <TableCell>{order.table_id}</TableCell>
              <TableCell>{order.customer_name}</TableCell>
              <TableCell>Rp {(order.total || 0).toLocaleString()}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.order_status)}>{order.order_status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
