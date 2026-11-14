import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

export async function GET() {
  await requireRole('admin', 'kasir')

  const { data, error } = await adminClient
    .from('tables')
    .select('id, name, area, capacity')
    .eq('is_active', true)
    .eq('status', 'kosong')
    .order('area')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}