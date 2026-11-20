'use client'

import { useEffect, useState } from 'react'
import { can, type Feature } from './permissions'
import type { Role } from './auth'

/**
 * Role user yang sedang login (dari /api/admin/me).
 * Dipakai untuk menyembunyikan tombol yang tidak boleh dipakai role tsb.
 * Ini hanya kosmetik: penegakan sebenarnya ada di server (requireFeature).
 */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.role) setRole(d.role as Role) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return role
}

/** true bila role saat ini boleh memakai fitur pada level tertentu. */
export function useCan(feature: Feature, level: 'view' | 'full' = 'view'): boolean {
  const role = useRole()
  if (!role) return false
  return can(role, feature, level)
}