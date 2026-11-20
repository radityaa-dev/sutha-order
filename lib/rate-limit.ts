// Rate limiter sederhana berbasis in-memory Map.
// Catatan: tidak persisten — reset saat serverless cold start. Untuk skala
// lebih besar, ganti dengan Upstash Redis / Supabase (lihat AUDIT_REPORT).

type Bucket = { count: number; resetTime: number }

const buckets = new Map<string, Bucket>()

/**
 * @param key      identitas unik (mis. IP)
 * @param limit    maksimum request per window
 * @param windowMs panjang window dalam milidetik
 * @returns true jika diizinkan, false jika melebihi limit
 */
export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now > existing.resetTime) {
    buckets.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (existing.count >= limit) return false

  existing.count++
  return true
}

/** Ambil IP dari request (fallback 'anonymous'). */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
}

/** Bersihkan bucket kedaluwarsa (panggil berkala / opsional). */
export function sweepRateLimits(): void {
  const now = Date.now()
  for (const [k, v] of buckets) {
    if (now > v.resetTime) buckets.delete(k)
  }
}