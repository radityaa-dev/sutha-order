import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { syncPayment } from '../../../../lib/payments/syncPayment'

export async function POST(req: NextRequest) {
  const webhookToken = req.headers.get('x-callback-token') || ''
  const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || ''

  console.log('[SYNC] Webhook request received')
  console.log('[SYNC] Token present:', !!webhookToken, 'Expected present:', !!expectedToken)

  if (!webhookToken || !expectedToken) {
    console.log('[SYNC] Webhook auth failed: missing token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let valid = false
  try {
    valid = timingSafeEqual(Buffer.from(webhookToken), Buffer.from(expectedToken))
  } catch {
    valid = false
  }

  console.log('[SYNC] Token valid:', valid)

  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const invoice = await req.json()

  console.log('[SYNC] Webhook invoice:', { external_id: invoice.external_id, status: invoice.status, id: invoice.id })

  try {
    const result = await syncPayment(invoice)
    if (result === 'noop') {
      console.log('[SYNC] Webhook: Order sudah diproses, diabaikan')
    } else if (result === 'amount_mismatch') {
      console.error('[SYNC] Webhook error: amount_mismatch')
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[SYNC] Webhook processing error:', err.message)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}