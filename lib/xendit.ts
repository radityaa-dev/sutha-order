const XENDIT_API_URL = 'https://api.xendit.co'
const API_VERSION = '2024-11-11'
const QRIS_CHANNEL_CODE = 'QRIS'

function getAuthHeader(): string {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY not configured')
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
}

function parseXenditError(data: any, status: number): string {
  // Pesan ramah untuk error umum Xendit
  const code = data?.code || data?.error_code || ''
  const msg = data?.message || data?.error || ''
  if (code === 'CHANNEL_NOT_ACTIVATED' || /not activated|belum diaktifkan/i.test(msg)) {
    return 'Kanal QRIS belum diaktifkan di dashboard Xendit.'
  }
  if (code === 'INVALID_AMOUNT' || /amount/i.test(msg) && /min|max|batas/i.test(msg)) {
    return 'Nominal di bawah/di atas batas QRIS.'
  }
  if (code === 'FORBIDDEN' || code === 'API_KEY_INVALID' || /permission|forbidden/i.test(msg)) {
    return 'API key tidak memiliki izin untuk membuat QRIS.'
  }
  return msg || `Xendit error (${status})`
}

export async function createInvoice(params: any) {
  const res = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: getAuthHeader() },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xendit Error')
  return data
}

export async function getInvoice(invoiceId: string) {
  const res = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}`, {
    headers: { Authorization: getAuthHeader() },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xendit Error')
  return data
}

export async function listInvoices(externalId: string) {
  const res = await fetch(`${XENDIT_API_URL}/v2/invoices?external_id=${externalId}`, {
    headers: { Authorization: getAuthHeader() },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xendit Error')
  return data
}

// ============================================================
// QRIS (Xendit Payment Requests v3)
// ============================================================
export interface CreateQrParams {
  referenceId: string
  amount: number
  description?: string
  metadata?: Record<string, any>
  expiresAt: string // ISO 8601
}

export async function createQrCode(params: CreateQrParams) {
  const body = {
    reference_id: params.referenceId,
    type: 'PAY',
    country: 'ID',
    currency: 'IDR',
    request_amount: params.amount,
    capture_method: 'AUTOMATIC',
    channel_code: QRIS_CHANNEL_CODE,
    channel_properties: {
      qr_string_type: 'DYNAMIC',
      expires_at: params.expiresAt,
    },
    description: params.description || 'Pembayaran QRIS',
    metadata: params.metadata || {},
  }

  const res = await fetch(`${XENDIT_API_URL}/v3/payment_requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'api-version': API_VERSION,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    const err: any = new Error(parseXenditError(data, res.status))
    err.code = data?.code || data?.error_code
    throw err
  }

  const qrAction = (data.actions || []).find(
    (a: any) => a.type === 'PRESENT_TO_CUSTOMER' && a.descriptor === 'QR_STRING'
  )
  const qrString = qrAction?.value || data.qr_string || data.qr_code?.qr_string

  return {
    id: data.id,
    reference_id: data.reference_id,
    status: data.status,
    amount: data.request_amount ?? data.amount,
    qr_string: qrString,
    expires_at: data.channel_properties?.expires_at || params.expiresAt,
    raw: data,
  }
}

export async function getQrCode(paymentRequestId: string) {
  const res = await fetch(`${XENDIT_API_URL}/v3/payment_requests/${paymentRequestId}`, {
    headers: {
      Authorization: getAuthHeader(),
      'api-version': API_VERSION,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xendit Error')
  return data
}

export async function simulateQrPayment(paymentRequestId: string, amount: number) {
  const res = await fetch(`${XENDIT_API_URL}/v3/payment_requests/${paymentRequestId}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
      'api-version': API_VERSION,
    },
    body: JSON.stringify({ amount }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Xendit Error')
  return data
}