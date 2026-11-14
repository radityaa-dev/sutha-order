'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/format'

type ReadyOrder = {
  short_number: number
  customer_name: string
  order_code: string
}

export default function QueuePage() {
  const [orders, setOrders] = useState<ReadyOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    const fetchReady = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('short_number, customer_name, order_code')
        .eq('order_status', 'ready')
        .eq('serving_method', 'ambil_sendiri')
        .neq('payment_status', 'paid')
        .order('ready_at', { ascending: true })
        .limit(20)

      if (!error && data) setOrders(data)
      setLoading(false)
    }

    fetchReady()

    const channel = supabase
      .channel('queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: "order_status=eq.ready,serving_method=eq.ambil_sendiri",
        },
        () => fetchReady()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function initials(name: string): string {
    return name
      .split(' ')
      .map(w => w[0].toUpperCase())
      .join('.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Memuat antrean...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <h1 className="text-3xl font-bold text-center">Layar Antrean</h1>
        <p className="text-center text-primary-foreground/80 mt-1">Pesanan siap diambil · Ambil Sendiri</p>
      </header>

      <main className="flex-1 p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <p className="text-2xl font-bold text-muted-foreground">Belum Ada Pesanan Siap</p>
            <p className="text-muted-foreground mt-2">Pesanan dengan status <b>Siap</b> dan metode <b>Ambil Sendiri</b> akan muncul di sini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-6xl mx-auto">
            {orders.map((o) => (
              <div
                key={o.order_code}
                className="relative bg-card border rounded-xl p-6 flex flex-col items-center justify-center transition-all"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                <div className="absolute top-3 right-3 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                  #{String(o.short_number).padStart(3, '0')}
                </div>
                <div className="text-6xl font-extrabold text-primary mb-2">
                  {String(o.short_number).padStart(3, '0')}
                </div>
                <div className="text-xl font-medium text-center">
                  {o.customer_name ? `${initials(o.customer_name)}` : '—'}
                </div>
                <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
                  {o.order_code}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}