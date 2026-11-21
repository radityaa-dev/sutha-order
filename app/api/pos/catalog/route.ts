import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireFeature } from '@/lib/auth'
import { withAuthErrors } from '@/lib/api-auth'

export async function GET() {
  return withAuthErrors(async () => {
    await requireFeature('pos', 'full')

    const { data: menus, error } = await adminClient
      .from('menus')
      .select('id, name, price, image_url, is_available, is_active')
      .eq('is_available', true)
      .eq('is_active', true)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ menus })
  })
}