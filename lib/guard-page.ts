import { redirect } from 'next/navigation'
import { getSessionUser } from './auth'
import { can, roleHome, type Feature } from './permissions'

/**
 * Guard halaman (dipakai di layout server tiap rute).
 * - Belum login → /login
 * - Role tidak cukup → beranda role-nya
 */
export async function guardPage(feature: Feature, level: 'view' | 'full' = 'view') {
  const user = await getSessionUser().catch(() => null)
  if (!user) redirect('/login')
  if (!can(user.role, feature, level)) redirect(roleHome(user.role))
  return user
}