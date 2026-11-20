import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireFeature } from '@/lib/auth'
import { createQrCode } from '@/lib/xendit'
import { getActiveShift } from '@/lib/qr-shift'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const orderId = (await params).token

  try {
    const user = await requireFeature('pos', 'full')
    const shiftId = await getActiveShift(user.id)
    if (!shiftId) {
      return NextResponse.json({ error: 'Tidak ada shift aktif. Buka shift terlebih dahulu.' }, { status: 400 })
    }

    // Cari order
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, order_code, total')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 })
    }

    // Cek apakah sudah ada QR pending
    const { data: existingQr, error: existingQrError } = await adminClient
      .from('payments')
      .select('id, transaction_id, status, raw_payload')
      .eq('order_id', orderId)
      .eq('method', 'qris_xendit')
      .eq('status', 'pending')
      .single()

    if (existingQrError && existingQrError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking existing QR:', existingQrError)
      return NextResponse.json({ error: 'Gagal memeriksa QR sebelumnya.' }, { status: 500 })
    }

    if (existingQr) {
      return NextResponse.json({
        payment_id: existingQr.id,
        qr_string: existingQr.raw_payload.qr_string,
        amount: existingQr.raw_payload.amount,
        expires_at: existingQr.raw_payload.expires_at,
      })
    }

    // Buat QR baru
    const referenceId = `${order.order_code}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 menit
    const description = `Pembayaran untuk order ${order.order_code}`

    const qr = await createQrCode({
      referenceId,
      amount: order.total,
      expiresAt,
      description,
      metadata: { orderId: order.id },
    })

    // Simpan payment
    const { data: paymentRow, error: insertError } = await adminClient
      .from('payments')
      .insert({
        order_id: order.id,
        transaction_id: qr.id,
        amount: qr.amount,
        status: 'pending',
        method: 'qris_xendit',
        shift_id: shiftId,
        confirmed_by: user.id,
        raw_payload: {
          qr_string: qr.qr_string,
          amount: qr.amount,
          expires_at: qr.expires_at,
        },
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error inserting payment:', insertError)
      return NextResponse.json({ error: 'Gagal menyimpan data pembayaran.' }, { status: 500 })
    }

    return NextResponse.json({
      payment_id: paymentRow.id,
      qr_string: qr.qr_string,
      amount: qr.amount,
      expires_at: qr.expires_at,
    })
  } catch (e: any) {
    console.error('Error creating QRIS:', e)
    return NextResponse.json({ error: e.message || 'Gagal membuat QRIS.' }, { status: 500 })
  }
}