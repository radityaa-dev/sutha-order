import { NextResponse } from 'next/server'

/**
 * Petakan error otorisasi ke status HTTP yang tepat.
 * Dipakai route handler agar tidak membalas 500 untuk kasus yang sebenarnya
 * "belum login" (401) atau "role tidak berhak" (403).
 */
export function authErrorStatus(err: unknown): 401 | 403 | null {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  if (msg === 'Unauthorized') return 401
  if (msg.includes('tidak memiliki akses')) return 403
  if (msg.includes('Akun tidak aktif') || msg.includes('Profil pengguna tidak ditemukan')) return 403
  return null
}

/**
 * Bungkus handler: menjalankan `fn`, dan bila error-nya error otorisasi,
 * balas 401/403. Error lain diteruskan sebagai 500 dengan pesan generik.
 */
export async function withAuthErrors(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn()
  } catch (err) {
    const status = authErrorStatus(err)
    if (status) {
      return NextResponse.json(
        { error: status === 401 ? 'Silakan masuk terlebih dahulu' : 'Anda tidak memiliki akses' },
        { status }
      )
    }
    console.error('[API] Unhandled error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
}