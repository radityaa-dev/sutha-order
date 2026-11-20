'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { homePathForRole, type Role } from '@/lib/auth'

const VALID_ROLES: Role[] = ['admin', 'kasir', 'dapur', 'stakeholder']

export interface LoginState {
  error?: string
}

/**
 * Login via Server Action.
 * - signInWithPassword pada server dengan cookie client (createServerClient).
 * - Cek profil di server yang sama.
 * - Jika valid → redirect() (cookie sudah tertulis di respons yang sama).
 * - Jika tidak valid → signOut + kembalikan error (tanpa redirect).
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    const msg = error?.message || ''
    if (msg.includes('Invalid login credentials')) {
      return { error: 'Email atau password salah.' }
    }
    if (msg.includes('Email not confirmed')) {
      return { error: 'Email belum dikonfirmasi. Hubungi pengelola.' }
    }
    return { error: 'Login gagal. Coba lagi.' }
  }

  // Query profil: bedakan error (jaringan/5xx) vs hasil kosong.
  let profile: { role: string; is_active: boolean } | null = null
  let profileError: unknown = null

  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const res = await admin
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', data.user.id)
      .maybeSingle()
    profile = res.data ?? null
    profileError = res.error
  } catch (e) {
    profileError = e
  }

  // Query profil gagal (jaringan/timeout/5xx): JANGAN signOut, JANGAN redirect.
  if (profileError) {
    console.error('[LOGIN] Profil query error:', profileError)
    return { error: 'Tidak dapat memverifikasi profil. Periksa koneksi lalu coba lagi.' }
  }

  if (!profile) {
    await supabase.auth.signOut()
    return { error: 'Profil pengguna tidak ditemukan. Hubungi pengelola.' }
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'Akun tidak aktif. Hubungi pengelola.' }
  }

  const role = profile.role as Role
  if (!VALID_ROLES.includes(role)) {
    await supabase.auth.signOut()
    return { error: 'Role tidak dikenal. Hubungi pengelola.' }
  }

  // Redirect di server → cookie sesi ikut tertulis di respons yang sama.
  redirect(homePathForRole(role))
}