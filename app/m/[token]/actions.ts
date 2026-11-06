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
    .select('*, categories(name)')
    // .eq('is_available', true) // Dihapus sementara untuk tes

  if (error) {
    console.error('Error fetching menus:', error)
    return []
  }
  return data
}
