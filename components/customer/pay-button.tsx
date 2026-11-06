'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { toast } from 'sonner'

export function PayButton({ orderCode }: { orderCode: string }) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    let count = 0
    const interval = setInterval(async () => {
      if (count >= 3) {
        clearInterval(interval)
        return
      }
      count++
      try {
        const res = await fetch(`/api/orders/${orderCode}/check`, { method: 'POST' })
        if (!res.ok && res.status >= 400 && res.status < 500) {
          count++
        }
        const data = await res.json()
        if (data.status === 'paid' || data.status === 'settled') {
          window.location.reload()
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [orderCode])

  async function handlePay(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderCode}/pay`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      window.location.href = data.invoiceUrl
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheck(e: React.MouseEvent) {
    e.preventDefault()
    setChecking(true)
    try {
      const res = await fetch(`/api/orders/${orderCode}/check`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      if (data.status === 'PAID' || data.status === 'SETTLED' || data.status === 'paid') {
        toast.success('Pembayaran lunas')
        window.location.reload()
        return
      }
      toast.message(`Status: ${data.status}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" size="lg" onClick={handlePay} disabled={loading || checking}>
        {loading ? 'Memproses...' : 'Bayar Sekarang'}
      </Button>
      <Button type="button" className="w-full" variant="outline" onClick={handleCheck} disabled={loading || checking}>
        {checking ? 'Memeriksa...' : 'Cek Status Pembayaran'}
      </Button>
    </div>
  )
}
