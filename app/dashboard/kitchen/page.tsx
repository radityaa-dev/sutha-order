'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { formatRupiah } from '../../../lib/format'
import { cn } from '../../../lib/utils'
import { Clock, AlertTriangle, ChefHat, CheckCheck, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'

type Order = {
  id: string
  order_code: string
  short_number: number
  customer_name: string
  total: number
  order_status: 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'expired'
  payment_status: 'pending' | 'paid' | 'failed' | 'expired'
  serving_method: 'ambil_sendiri' | 'antar_meja' | 'antar_gedung'
  accepted_at: string | null
  ready_at: string | null
  created_at: string
  tables: { name: string } | null
  order_items: {
    id: string
    menu_name: string
    price: number
    qty: number
    notes?: string
    modifiers: { group_name: string; option_name: string; price_delta: number }[]
  }[]
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [station, setStation] = useState<'all' | 'dapur' | 'bar'>('all')
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      let query = createClient()
        .from('orders')
        .select(`
          *,
          tables (name),
          order_items (id, menu_name, price, qty, notes, modifiers, menus!inner (categories!inner (station)))
        `)
        .in('order_status', ['paid', 'preparing', 'ready'])
        .neq('payment_status', 'paid')
        .order('accepted_at', { ascending: true })

      if (station === 'dapur') {
        query = query.eq('order_items.menus.categories.station', 'dapur')
      } else if (station === 'bar') {
        query = query.eq('order_items.menus.categories.station', 'bar')
      }

      const { data, error } = await query
      if (error) throw error
      setOrders(data || [])
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat antrean')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const channel = createClient()
      .channel('orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { createClient().removeChannel(channel) }
  }, [station])

  const isOverdue = (acceptedAt: string | null) => {
    if (!acceptedAt) return false
    return new Date().getTime() - new Date(acceptedAt).getTime() > 30 * 60 * 1000
  }

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, nextStatus })
      })
      if (!res.ok) throw new Error('Gagal update status')
      toast.success('Status diperbarui')
      fetchOrders()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const activeOrders = orders.filter(o => o.order_status !== 'completed' && o.order_status !== 'cancelled')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Antrean Dapur & Bar</h1>
      </div>

      <Tabs defaultValue="all" onValueChange={setStation}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="dapur">Dapur (Makanan)</TabsTrigger>
          <TabsTrigger value="bar">Bar (Minuman)</TabsTrigger>
        </TabsList>

        {['all', 'dapur', 'bar'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <p className="text-center text-muted-foreground">Memuat antrean...</p>
            ) : activeOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tidak ada pesanan aktif</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeOrders.map((order) => (
                  <Card key={order.id} className={cn(isOverdue(order.accepted_at) && 'border-destructive')}>
                    {isOverdue(order.accepted_at) && (
                      <div className="bg-destructive/10 border-b px-3 py-1 flex items-center gap-2 text-destructive text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <span>TERLAMBAT (&gt;30m)</span>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">
                            #{String(order.short_number).padStart(3, '0')}
                            {order.tables && <span className="text-sm font-normal text-muted-foreground ml-2">· {order.tables.name}</span>}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{order.customer_name || 'Walk-in'}</p>
                        </div>
                        <Badge variant={order.order_status === 'ready' ? 'default' : 'outline'}>
                          {order.order_status === 'paid' ? 'Menunggu' :
                           order.order_status === 'preparing' ? 'Diproses' : 'Siap'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                          <span className="font-medium">{item.qty}x {item.menu_name}</span>
                          <span>{formatRupiah(item.price * item.qty)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t pt-2">
                        <span className="text-sm text-muted-foreground">
                          {order.serving_method === 'ambil_sendiri' && <span className="flex items-center gap-1"><ChefHat className="h-3 w-3" /> Ambil Sendiri</span>}
                          {order.serving_method === 'antar_meja' && <span className="flex items-center gap-1"><PackageCheck className="h-3 w-3" /> Antar Meja</span>}
                          {order.serving_method === 'antar_gedung' && <span className="flex items-center gap-1"><PackageCheck className="h-3 w-3" /> Antar Gedung</span>}
                        </span>
                        {order.accepted_at && (
                          <span className="text-xs text-muted-foreground">
                            Diterima: {new Date(order.accepted_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {order.order_status === 'paid' && (
                          <Button size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                            <ChefHat className="h-3 w-3 mr-1" /> Mulai Masak
                          </Button>
                        )}
                        {order.order_status === 'preparing' && (
                          <Button size="sm" className="flex-1" onClick={() => updateOrderStatus(order.id, 'ready')}>
                            <CheckCheck className="h-3 w-3 mr-1" /> Siap
                          </Button>
                        )}
                        {order.order_status === 'ready' && (
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => updateOrderStatus(order.id, 'completed')}>
                            <PackageCheck className="h-3 w-3 mr-1" /> Selesai
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}