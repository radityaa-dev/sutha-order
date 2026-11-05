'use server'

import { adminClient } from '../../../lib/supabase/admin'

export async function getTableByToken(token: string) {
  const { data, error } = await adminClient
    .from('tables')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return data
}

export async function getPublishedMenus() {
  const { data, error } = await adminClient
    .from('menus')
    .select('*, categories(*)')
    .order('sort_order', { referencedTable: 'categories', ascending: true })
    .order('name', { referencedTable: 'menus', ascending: true })

  if (error) return []
  return data
}
