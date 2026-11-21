import { headers } from 'next/headers'
import { createClient } from '../lib/supabase/server'
import { adminClient } from '../lib/supabase/admin'
import { can, roleHome, type Feature } from './permissions'

export type Role = 'admin' | 'kasir' | 'dapur' | 'stakeholder'

export interface SessionUser {
  id: string
  email: string
  role: Role
  full_name: string
  is_active: boolean
}

const VALID_ROLES: Role[] = ['admin', 'kasir', 'dapur', 'stakeholder']

/**
 * Identitas dari middleware (sudah terverifikasi di sana).
 * Middleware memverifikasi JWT lalu menuliskan hasilnya ke header request.
 *
 * PENTING: header ini hanya dipercaya bila request juga membawa cookie sesi
 * Supabase. Tanpa syarat itu, siapa pun bisa memalsukan header (route /api/*
 * tidak melewati middleware, sehingga header kiriman klien tidak dibersihkan).
 * Bila cookie tidak ada, kembalikan null agar verifikasi dilakukan penuh.
 */
async function fromMiddlewareHeaders(): Promise<SessionUser | null> {
  // Harus ada cookie sesi Supabase (sb-<ref>-auth-token atau versi chunk-nya).
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!/(^|;\s*)sb-[^;=]*-auth-token(\.\d+)?=/.test(cookieHeader)) {
    return null
  }

  const h = await headers()
  const id = h.get('x-user-id')
  const role = h.get('x-user-role') as Role | null
  if (!id || !role || !VALID_ROLES.includes(role)) return null
  if (h.get('x-user-active') !== '1') return null

  let fullName = ''
  const encoded = h.get('x-user-name')
  if (encoded) {
    try {
      fullName = Buffer.from(encoded, 'base64').toString('utf8')
    } catch {
      fullName = ''
    }
  }

  return {
    id,
    email: h.get('x-user-email') ?? '',
    role,
    full_name: fullName,
    is_active: true,
  }
}

/**
 * Ambil user + profile.
 * Jalur cepat: header dari middleware (tanpa jaringan).
 * Jalur cadangan: verifikasi sendiri, untuk konteks yang tidak lewat middleware
 * (mis. Server Action / route handler tertentu).
 */
export async function getSessionUser(): Promise<SessionUser> {
  const fromHeaders = await fromMiddlewareHeaders()
  if (fromHeaders) return fromHeaders

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await adminClient
    .from('user_profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[AUTH] Profil query error:', profileError)
    throw new Error('Gagal memverifikasi profil. Coba lagi.')
  }

  if (!profile) {
    throw new Error('Profil pengguna tidak ditemukan')
  }

  if (!profile.is_active) {
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

// Alias lama untuk action /admin/* (kategori, menu, modifier, meja, order).
// WAJIB role admin — katalog & QR meja admin-only sesuai matriks.
export async function requireAdmin() {
  const user = await getSessionUser()
  if (user.role !== 'admin') {
    throw new Error('Anda tidak memiliki akses ke fitur ini')
  }
  return user
}

// RBAC guard: pastikan user memiliki salah satu role yang diizinkan.
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!roles.includes(user.role)) {
    throw new Error('Anda tidak memiliki akses ke fitur ini')
  }
  return user
}

// Penegakan matriks lib/permissions.ts. Melempar error bila role tidak cukup.
export async function requireFeature(feature: Feature, level: 'view' | 'full' = 'view'): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!can(user.role, feature, level)) {
    throw new Error('Anda tidak memiliki akses ke fitur ini')
  }
  return user
}

// Redirect awal sesuai role saat login (dipakai middleware & login page).
export function homePathForRole(role: Role): string {
  return roleHome(role)
}