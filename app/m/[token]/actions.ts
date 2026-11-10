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
    .select(`
      *,
      categories(name),
      menu_modifier_groups(
        sort_order,
        modifier_groups(
          *,
          modifier_options(*)
        )
      )
    `)
    .eq('is_available', true)
    .order('name')

  if (error) {
    console.error('Error fetching menus:', error)
    return []
  }

  // Transform data untuk memudahkan UI
  return data.map((menu: any) => ({
    ...menu,
    modifier_groups: menu.menu_modifier_groups
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((mg: any) => ({
        ...mg.modifier_groups,
        options: mg.modifier_groups.modifier_options
          .filter((opt: any) => opt.is_available)
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
      }))
  }))
}
