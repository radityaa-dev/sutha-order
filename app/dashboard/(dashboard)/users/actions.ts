'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '../../../../lib/supabase/admin'
import { requireRole } from '../../../../lib/auth'

// Hanya admin yang boleh mengelola akun staf
async function requireAdminUser() {
  return requireRole('admin')
}

export async function getUsers() {
  await requireAdminUser()
  const { data, error } = await adminClient
    .from('user_profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createUser(input: {
  full_name: string
  email: string
  password: string
  role: string
}) {
  await requireAdminUser()

  // 1. Buat akun Supabase Auth (invite agar email terkonfirmasi)
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })
  if (authError) throw new Error(authError.message)

  // 2. Buat profil
  const { error: profileError } = await adminClient.from('user_profiles').insert({
    id: authUser.user.id,
    full_name: input.full_name,
    email: input.email,
    role: input.role,
  })
  if (profileError) throw new Error(profileError.message)

  revalidatePath('/dashboard/users')
}

export async function updateUser(
  id: string,
  input: { full_name?: string; role?: string; is_active?: boolean }
) {
  await requireAdminUser()
  const { error } = await adminClient
    .from('user_profiles')
    .update(input)
    .eq('id', id)

  if (error) throw error
  revalidatePath('/dashboard/users')
}

export async function deleteUser(id: string) {
  await requireAdminUser()

  // Cegah menghapus diri sendiri
  const current = await requireAdminUser()
  if (current.id === id) throw new Error('Tidak bisa menghapus akun sendiri')

  // Hapus profil (auth.users terhapus via ON DELETE CASCADE)
  const { error } = await adminClient.from('user_profiles').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/dashboard/users')
}

// Set 6-digit PIN untuk admin (hash via RPC server-side)
export async function setPin(userId: string, pin: string) {
  await requireAdminUser()

  const { error } = await adminClient.rpc('set_admin_pin', {
    p_user_id: userId,
    p_pin: pin,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/users')
}
