'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '../../../../lib/supabase/admin'
import { requireAdmin } from '../../../../lib/auth'
import { randomInt } from 'crypto'

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function generateBase62Token(length = 12): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS[randomInt(0, BASE62_CHARS.length)]
  }
  return result
}

async function generateUniqueTableToken(): Promise<string> {
  let attempts = 0
  while (attempts < 10) {
    const token = generateBase62Token(12)
    const { data } = await adminClient
      .from('tables')
      .select('id')
      .eq('token', token)
      .maybeSingle()
    if (!data) return token
    attempts++
  }
  throw new Error('Gagal menghasilkan token meja unik')
}

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
  const token = await generateUniqueTableToken()
  const { error } = await adminClient.from('tables').insert({ name, token })
  if (error) throw error
  revalidatePath('/admin/tables')
}

export async function updateTable(id: string, name: string) {
  await requireAdmin()
  const { error, count } = await adminClient
    .from('tables')
    .update({ name })
    .eq('id', id)
    .select()
    
  if (error) throw error
  if (!count || count === 0) throw new Error('Meja tidak ditemukan')
  
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
  const token = await generateUniqueTableToken()
  const { error } = await adminClient.from('tables').update({ token }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/tables')
}
