'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '../../../lib/supabase/admin'
import { requireAdmin } from '../../../lib/auth'
import { randomBytes } from 'crypto'

export async function getTables() {
  await requireAdmin()
  const { data, error } = await adminClient
    .from('tables')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data
}

export async function createTable(name: string) {
  await requireAdmin()
  const token = randomBytes(16).toString('hex')
  const { error } = await adminClient.from('tables').insert({ name, token })
  if (error) throw error
  revalidatePath('/admin/tables')
}

export async function toggleTableStatus(id: string, is_active: boolean) {
  await requireAdmin()
  const { error } = await adminClient.from('tables').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
}

export async function deleteTable(id: string) {
  await requireAdmin()
  const { error } = await adminClient.from('tables').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
}

export async function regenerateToken(id: string) {
  await requireAdmin()
  const token = randomBytes(16).toString('hex')
  const { error } = await adminClient.from('tables').update({ token }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
}
