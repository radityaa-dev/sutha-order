import { createClient } from '../lib/supabase/server'
import { adminClient } from '../lib/supabase/admin'

export type Role = 'admin' | 'kasir' | 'dapur' | 'stakeholder'

export interface SessionUser {
  id: string
  email: string
  role: Role
  full_name: string
  is_active: boolean
}

// Ambil user + profile dari Supabase Auth. Melempar error jika tidak login.
export async function getSessionUser(): Promise<SessionUser> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    throw new Error('Akun tidak aktif')
  }

  return {
    id: user.id,
    email: user.email,
    role: profile.role as Role,
    full_name: profile.full_name,
    is_active: profile.is_active,
  }
}

// Backward-compat alias: semua action lama memanggil requireAdmin()
export async function requireAdmin() {
  return getSessionUser()
}

// RBAC guard: pastikan user memiliki salah satu role yang diizinkan.
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!roles.includes(user.role)) {
    throw new Error('Anda tidak memiliki akses ke fitur ini')
  }
  return user
}

// Redirect awal sesuai role saat login (dipakai middleware & login page).
export function homePathForRole(role: Role): string {
  switch (role) {
    case 'kasir':
      return '/dashboard/pos'
    case 'dapur':
      return '/dashboard/kitchen'
    default:
      return '/dashboard'
  }
}
