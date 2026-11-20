'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../lib/supabase/client'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { cn } from '../../../lib/utils'
import { Clock, AlertTriangle, ChefHat, CheckCheck, PackageCheck, Loader2 } from 'lucide-react'
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
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchOrders = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          tables (name),
          order_items (id, menu_name, price, qty, notes, modifiers)
        `)
        .eq('payment_status', 'paid')
        .in('order_status', ['paid', 'preparing', 'ready'])
        .order('created_at', { ascending: true })

      if (error) throw error

      let filtered = (data || []) as Order[]

      // Filter stasiun: cek kategori menu per item
      if (station !== 'all') {
        const { data: catRows } = await supabase
          .from('categories')
          .select('id, station')
          .eq('station', station)
        const stationCatIds = new Set((catRows || []).map((c: any) => c.id))

        if (stationCatIds.size > 0) {
          const { data: mmg } = await supabase
            .from('menus')
            .select('id, category_id')
            .in('category_id', Array.from(stationCatIds) as string[])
          const menuIds = new Set((mmg || []).map((m: any) => m.id))

          if (menuIds.size > 0) {
            const { data: oi } = await supabase
              .from('order_items')
              .select('order_id, menu_id')
              .in('menu_id', Array.from(menuIds) as string[])
            const orderIds = new Set((oi || []).map((x: any) => x.order_id))
            filtered = filtered.filter((o) => orderIds.has(o.id))
          } else {
            filtered = []
          }
        } else {
          filtered = []
        }
      }

      setOrders(filtered)
    } catch (e: any) {
      toast.error(e.message || 'Gagal memuat antrean')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const supabase = createClient()
    const channel = supabase
      .channel('kitchen_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [station])

  const isOverdue = (acceptedAt: string | null) => {
    if (!acceptedAt) return false
    return new Date().getTime() - new Date(acceptedAt).getTime() > 30 * 60 * 1000
  }

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    setUpdatingId(orderId)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, nextStatus })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal update status')
      }
      toast.success('Status diperbarui')
      fetchOrders()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const activeOrders = orders.filter(o => o.order_status !== 'completed' && o.order_status !== 'cancelled')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="type-display text-[22px] text-ink md:text-[26px]">Antrean Dapur & Bar</h1>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setStation(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="dapur">Dapur (Makanan)</TabsTrigger>
          <TabsTrigger value="bar">Bar (Minuman)</TabsTrigger>
        </TabsList>

        {['all', 'dapur', 'bar'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {loading ? (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat antrean...
              </p>
            ) : activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed py-12 text-center">
                <p className="text-sm text-muted-foreground">Tidak ada pesanan aktif</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeOrders.map((order) => {
                  const late = isOverdue(order.accepted_at)
                  return (
                  <Card
                    key={order.id}
                    className={cn(
                      'flex flex-col overflow-hidden',
                      late
                        ? 'border-l-[3px] border-l-[var(--danger)] border-y border-r border-[var(--line)]'
                        : 'border border-[var(--line)]'
                    )}
                  >
                    {late && (
                      <div className="flex items-center gap-2 bg-[var(--danger-soft)] px-4 py-1.5 text-[13px] font-semibold text-[var(--danger)]">
                        <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                        Terlambat &gt; 30 menit
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="type-hero text-[40px] leading-none text-ink">
                            #{String(order.short_number).padStart(3, '0')}
                          </CardTitle>
                          <p className="mt-1.5 text-[18px] font-semibold text-ink">
                            {order.customer_name || 'Walk-in'}
                          </p>
                          <p className="text-[14px] text-ink-muted">
                            {order.tables?.name || 'Tanpa meja'} ·{' '}
                            {order.serving_method === 'ambil_sendiri' ? 'Ambil sendiri'
                              : order.serving_method === 'antar_meja' ? 'Antar meja' : 'Antar gedung'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 rounded-sm px-2 py-1 text-[13px] font-semibold',
                            order.order_status === 'paid' && 'border-[var(--warning)] text-[var(--warning)]',
                            order.order_status === 'preparing' && 'border-[var(--brand-700)] text-[var(--brand-700)]',
                            order.order_status === 'ready' && 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                          )}
                        >
                          {order.order_status === 'paid' ? 'Menunggu' :
                           order.order_status === 'preparing' ? 'Diproses' : 'Siap'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3 pt-0">
                      <ul className="space-y-2">
                        {order.order_items.map((item) => (
                          <li key={item.id} className="flex items-baseline gap-2 border-b border-[var(--line)] pb-2 last:border-0">
                            <span className="type-money w-7 shrink-0 text-[18px] font-bold text-ink">
                              {item.qty}×
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[18px] font-semibold leading-snug text-ink">
                                {item.menu_name}
                              </span>
                              {item.modifiers?.length > 0 && (
                                <span className="block text-[14px] text-ink-muted">
                                  {item.modifiers.map((m) => m.option_name).join(', ')}
                                </span>
                              )}
                              {item.notes && (
                                <span className="block text-[14px] font-medium text-[var(--warning)]">
                                  Catatan: {item.notes}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.accepted_at && (
                        <p className="text-[13px] text-ink-faint">
                          Diterima {new Date(order.accepted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      <div className="mt-auto flex gap-2 pt-1">
                        {order.order_status === 'paid' && (
                          <Button className="h-12 flex-1 rounded-[var(--radius-sm)] text-[15px] font-semibold" disabled={updatingId === order.id} onClick={() => updateOrderStatus(order.id, 'preparing')}>
                            <ChefHat className="mr-1.5 h-4 w-4" strokeWidth={1.75} /> Mulai masak
                          </Button>
                        )}
                        {order.order_status === 'preparing' && (
                          <Button className="h-12 flex-1 rounded-[var(--radius-sm)] text-[15px] font-semibold" disabled={updatingId === order.id} onClick={() => updateOrderStatus(order.id, 'ready')}>
                            <CheckCheck className="mr-1.5 h-4 w-4" strokeWidth={1.75} /> Siap
                          </Button>
                        )}
                        {order.order_status === 'ready' && (
                          <Button variant="outline" className="h-12 flex-1 rounded-[var(--radius-sm)] text-[15px] font-semibold" disabled={updatingId === order.id} onClick={() => updateOrderStatus(order.id, 'completed')}>
                            <PackageCheck className="mr-1.5 h-4 w-4" strokeWidth={1.75} /> Selesai
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}