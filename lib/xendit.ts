// lib/xendit.ts
const XENDIT_API_URL = 'https://api.xendit.co'

function getAuthHeader(): string {
  const secretKey = process.env.XENDIT_SECRET_KEY
  if (!secretKey) throw new Error('XENDIT_SECRET_KEY not configured')
  return `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`
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
