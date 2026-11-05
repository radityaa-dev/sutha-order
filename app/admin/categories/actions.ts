'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { adminClient } from '../../../lib/supabase/admin'
import { requireAdmin } from '../../../lib/auth'

export async function getCategories() {
  const user = await requireAdmin()
  const { data, error } = await adminClient.from('categories').select('*').order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function getCategoryById(id: string) {
  const user = await requireAdmin()
  const { data, error } = await adminClient.from('categories').select('*').eq('id', id).single()

  if (error) throw error
  return data
}

export async function createCategory(data: { name: string }) {
  const user = await requireAdmin()
  const { error } = await adminClient.from('categories').insert({
    name: data.name,
    sort_order: 0,
  })

  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function updateCategory(id: string, data: { name?: string; sort_order?: number }) {
  const user = await requireAdmin()
  const { error } = await adminClient.from('categories').update(data).eq('id', id)

  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function deleteCategory(id: string) {
  const user = await requireAdmin()
  
  // Check if category has menus
  const { data: menus } = await adminClient
    .from('menus')
    .select('id')
    .eq('category_id', id)
    .limit(1)
  
  if (menus && menus.length > 0) {
    throw new Error('Kategori masih memiliki menu. Hapus menu terlebih dahulu.')
  }

  const { error } = await adminClient.from('categories').delete().eq('id', id)

  if (error) throw error
  revalidatePath('/admin/categories')
}

export async function reorderCategories(order: { id: string; sort_order: number }[]) {
  const user = await requireAdmin()
  const updates = order.map(item =>
    adminClient.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id)
  )
  await Promise.all(updates)
  revalidatePath('/admin/categories')
}
