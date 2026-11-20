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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-[16px] text-ink-muted">Memuat antrean…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-6 py-5">
        <h1 className="type-display text-[28px] text-ink md:text-[34px]">Pesanan siap diambil</h1>
        <p className="mt-1 text-[15px] text-ink-muted">
          Ambil di counter sesuai nomor. Tanpa perlu menunjukkan struk.
        </p>
      </header>

      <main className="flex-1 px-6 py-8">
        {orders.length === 0 ? (
          <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <p className="type-display text-[24px] text-ink">Belum ada pesanan siap</p>
            <p className="max-w-[420px] text-[15px] leading-relaxed text-ink-muted">
              Nomor akan muncul di sini begitu dapur menandai pesanan selesai.
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-[1400px] gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {orders.map((o) => (
              <div
                key={o.order_code}
                className="surface flex flex-col items-center justify-center px-6 py-8"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                <p className="type-hero type-money text-[clamp(72px,10vw,128px)] leading-none text-ink">
                  {String(o.short_number).padStart(3, '0')}
                </p>
                <p className="mt-3 text-[20px] font-semibold tracking-wide text-ink-muted">
                  {o.customer_name ? initials(o.customer_name) : '—'}
                </p>
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