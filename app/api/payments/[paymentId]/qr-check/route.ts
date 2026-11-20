import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { getQrCode } from '@/lib/xendit'
import { settleQrPayment } from '@/lib/payment-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params

  try {
    const { data: payment, error } = await adminClient
      .from('payments')
      .select('transaction_id, status')
      .eq('id', paymentId)
      .eq('method', 'qris_xendit')
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan.' }, { status: 404 })
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ status: payment.status })
    }

    // Tanya Xendit status QR
    let qr: any
    try {
      qr = await getQrCode(payment.transaction_id)
    } catch (e: any) {
      // Jika jaringan bermasalah, jangan ubah status apa pun.
      return NextResponse.json({ status: 'pending', warning: 'Gagal menghubungi Xendit' })
    }

    const paidAmount = Number(qr.request_amount ?? qr.amount ?? 0)

    if (qr.status === 'SUCCEEDED' || qr.status === 'PAID' || qr.status === 'SETTLED') {
      const result = await settleQrPayment(paymentId, paidAmount, qr.id)
      // 'noop' berarti sudah lunas sebelumnya — tetap laporkan sebagai paid.
      const status = result.status === 'paid' || result.status === 'noop' ? 'paid' : result.status
      return NextResponse.json({ status })
    }

    if (qr.status === 'EXPIRED' || qr.status === 'FAILED') {
      await adminClient.from('payments').update({ status: 'expired' }).eq('id', paymentId)
      return NextResponse.json({ status: 'expired' })
    }

    return NextResponse.json({ status: 'pending' })
  } catch (e: any) {
    console.error('Error checking QRIS status:', e)
    return NextResponse.json({ error: e.message || 'Gagal memeriksa status pembayaran.' }, { status: 500 })
  }
}