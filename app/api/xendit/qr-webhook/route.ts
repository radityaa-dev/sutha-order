import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { adminClient } from '@/lib/supabase/admin'
import { settleQrPayment } from '@/lib/payment-service'

export async function POST(req: NextRequest) {
  const webhookToken = req.headers.get('x-callback-token') || ''
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || ''

  if (!webhookToken || !expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let valid = false
  try {
    // Perbandingan konstan-waktu untuk cegah timing attack.
    const a = Buffer.from(webhookToken)
    const b = Buffer.from(expectedToken)
    valid = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    valid = false
  }

  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { event, data } = body

  if (event !== 'qr.paid') {
    return NextResponse.json({ error: 'Event tidak didukung.' }, { status: 400 })
  }

  const { id: paymentId, amount } = data

  if (!paymentId || amount <= 0) {
    return NextResponse.json({ error: 'Data tidak valid.' }, { status: 400 })
  }

  try {
    const result = await settleQrPayment(paymentId, amount)

    if (result.status === 'refund_pending') {
      await adminClient
        .from('activity_logs')
        .insert({
          action: 'qr_refund_pending',
          entity: 'payment',
          entity_id: paymentId,
          details: result,
        })
      return NextResponse.json({ message: 'Pembayaran kedaluwarsa atau sudah lunas, ditandai untuk refund.' })
    }

    if (result.status === 'paid') {
      return NextResponse.json({ message: 'Pembayaran berhasil diproses.' })
    }

    return NextResponse.json({ message: 'Pembayaran diproses.' })
  } catch (e: any) {
    console.error('Error settling QR payment:', e)
    return NextResponse.json({ error: 'Gagal memproses pembayaran.' }, { status: 500 })
  }
}