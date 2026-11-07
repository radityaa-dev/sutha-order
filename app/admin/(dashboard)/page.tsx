'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { ShoppingBag, DollarSign, Clock } from 'lucide-react'

type Stats = { todayOrders: number; todaySales: number; activeQueue: number }

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({ todayOrders: 0, todaySales: 0, activeQueue: 0 })

  useEffect(() => {
    let active = true

    async function load() {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      if (!res.ok || !active) return
      const data = await res.json()
      setStats({
        todayOrders: data.todayOrders || 0,
        todaySales: data.todaySales || 0,
        activeQueue: data.activeQueue || 0,
      })
    }

    load()
    const timer = setInterval(load, 10000)
    return () => {
      active = false
      clearInterval(timer)
    }
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
            <div className="text-2xl font-bold">Rp {stats.todaySales.toLocaleString('id-ID')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Antrean</CardTitle>
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
