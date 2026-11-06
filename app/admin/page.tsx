'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { ShoppingBag, DollarSign, Clock } from 'lucide-react'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ todayOrders: 0, todaySales: 0, activeQueue: 0 })

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch('/api/admin/orders')
      const orders = await res.json()
      if (res.ok && Array.isArray(orders)) {
        const today = new Date().toDateString()
        const todayOrdersList = orders.filter(o => new Date(o.created_at).toDateString() === today)
        const todaySales = todayOrdersList.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + (o.total || 0), 0)
        const activeQueue = orders.filter(o => o.payment_status === 'paid' && o.order_status !== 'completed' && o.order_status !== 'cancelled').length

        setStats({ todayOrders: todayOrdersList.length, todaySales, activeQueue })
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Hari Ini</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {stats.todaySales.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Antrean Dapur Aktif</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeQueue}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
