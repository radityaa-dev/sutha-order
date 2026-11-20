import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getSessionUser } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Identitas + status shift untuk shell admin.
 * Dipakai sekali oleh sidebar & topbar agar tidak masing-masing
 * memanggil auth.getUser() dan query user_profiles.
 */
export async function GET() {
  try {
    const user = await getSessionUser()

    const { data: shift } = await adminClient
      .from('shifts')
      .select('id, status, opened_at')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .maybeSingle()

    return NextResponse.json({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      has_shift: !!shift,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}