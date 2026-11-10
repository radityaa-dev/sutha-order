'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/auth'

export async function getModifierGroups() {
  await requireAdmin()
  const { data, error } = await adminClient
    .from('modifier_groups')
    .select('*, modifier_options(*), menu_modifier_groups(menu_id)')
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data
}

export async function createModifierGroup(data: any) {
  await requireAdmin()
  const { options, ...groupData } = data

  const { data: group, error: groupErr } = await adminClient
    .from('modifier_groups')
    .insert(groupData)
    .select()
    .single()

  if (groupErr) throw groupErr

  if (options && options.length > 0) {
    const optionsWithGroupId = options.map((opt: any) => ({
      ...opt,
      group_id: group.id
    }))
    const { error: optErr } = await adminClient
      .from('modifier_options')
      .insert(optionsWithGroupId)
    
    if (optErr) throw optErr
  }

  revalidatePath('/admin/modifiers')
}

export async function updateModifierGroup(id: string, data: any) {
  await requireAdmin()
  const { options, ...groupData } = data

  const { error: groupErr } = await adminClient
    .from('modifier_groups')
    .update(groupData)
    .eq('id', id)

  if (groupErr) throw groupErr

  // Simplest way: delete old options and insert new ones
  // In production, you might want to diff them
  await adminClient.from('modifier_options').delete().eq('group_id', id)

  if (options && options.length > 0) {
    const optionsWithGroupId = options.map((opt: any) => ({
      ...opt,
      group_id: id
    }))
    const { error: optErr } = await adminClient
      .from('modifier_options')
      .insert(optionsWithGroupId)
    
    if (optErr) throw optErr
  }

  revalidatePath('/admin/modifiers')
}

export async function deleteModifierGroup(id: string) {
  await requireAdmin()
  const { error } = await adminClient.from('modifier_groups').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/modifiers')
}

export async function getModifierGroupsForMenu(menuId: string) {
  const { data, error } = await adminClient
    .from('menu_modifier_groups')
    .select('group_id')
    .eq('menu_id', menuId)
  
  if (error) throw error
  return data.map(d => d.group_id)
}
