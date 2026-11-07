import { NextResponse } from 'next/server'
import { requireAdmin } from '../../../../lib/auth'
import { getDashboardStats } from '../../../../lib/admin-stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const stats = await getDashboardStats()
    return NextResponse.json(stats)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memuat statistik'
    const status = message === 'Unauthorized' ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
