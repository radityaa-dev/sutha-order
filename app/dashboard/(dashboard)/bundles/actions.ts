'use server'

import { adminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth'

async function requireBundleUser() {
  return requireRole('admin', 'kasir')
}

export async function getBundles() {
  await requireBundleUser()

  const { data, error } = await adminClient
    .from('bundles')
    .select(`
      *,
      bundle_items (
        id,
        menu_id,
        qty,
        menus (id, name, price)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createBundle(input: { name: string; description?: string; price: number; items: { menu_id: string; qty: number }[] }) {
  await requireBundleUser()

  const { data: bundle, error } = await adminClient
    .from('bundles')
    .insert({ name: input.name, description: input.description, price: input.price })
    .select()
    .single()

  if (error) throw error

  if (input.items.length > 0) {
    const items = input.items.map(item => ({
      bundle_id: bundle.id,
      menu_id: item.menu_id,
      qty: item.qty,
    }))

    const { error: itemsError } = await adminClient
      .from('bundle_items')
      .insert(items)

    if (itemsError) throw itemsError
  }

  return bundle
}

export async function updateBundle(id: string, input: { name?: string; description?: string; price?: number; is_active?: boolean; items?: { menu_id: string; qty: number }[] }) {
  await requireBundleUser()

  const { name, description, price, is_active, items, ...rest } = input

  const { error } = await adminClient
    .from('bundles')
    .update({ name, description, price, is_active })
    .eq('id', id)

  if (error) throw error

  if (items) {
    await adminClient.from('bundle_items').delete().eq('bundle_id', id)

    if (items.length > 0) {
      const { error: itemsError } = await adminClient
        .from('bundle_items')
        .insert(items.map(item => ({ bundle_id: id, menu_id: item.menu_id, qty: item.qty })))

      if (itemsError) throw itemsError
    }
  }
}

export async function deleteBundle(id: string) {
  await requireBundleUser()

  // Check if bundle is used in orders
  const { data: orderItems } = await adminClient
    .from('order_items')
    .select('id')
    .eq('bundle_id', id)
    .limit(1)

  if (orderItems && orderItems.length > 0) {
    throw new Error('Paket sudah digunakan dalam pesanan. Gunakan nonaktifkan saja.')
  }

  await adminClient.from('bundle_items').delete().eq('bundle_id', id)
  const { error } = await adminClient.from('bundles').delete().eq('id', id)

  if (error) throw error
}

export async function getMenusForBundle() {
  await requireBundleUser()

  const { data, error } = await adminClient
    .from('menus')
    .select('id, name, price')
    .eq('is_available', true)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}