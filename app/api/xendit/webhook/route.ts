import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { syncPayment } from '../../../../lib/payments/syncPayment'

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

  const invoice = await req.json()

  try {
    const result = await syncPayment(invoice)
    if (result === 'amount_mismatch') {
      // Amount mismatch perlu perhatian admin, tapi jangan bocorkan detail.
      console.error('[XENDIT] Payment amount mismatch for invoice:', invoice.id)
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[XENDIT] Webhook processing error:', err?.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}