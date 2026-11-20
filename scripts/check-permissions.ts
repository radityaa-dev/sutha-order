/**
 * scripts/check-permissions.ts
 * Verifikasi matriks lib/permissions.ts terhadap ekspektasi peran.
 * Jalankan: npx tsx scripts/check-permissions.ts
 * (Tidak butuh database — murni menguji peta izin.)
 */
import { can, PERMISSIONS, type Feature } from '../lib/permissions'
import type { Role } from '../lib/auth'

const ROLES: Role[] = ['admin', 'kasir', 'dapur', 'stakeholder']

// Ekspektasi dari matriks PRD: fitur -> role -> level minimum
const EXPECTED: { feature: Feature; allowed: Partial<Record<Role, 'view' | 'full'>> }[] = [
  { feature: 'pos', allowed: { kasir: 'full' } },
  { feature: 'approval', allowed: { admin: 'full' } },
  { feature: 'shiftHistory', allowed: { admin: 'full', stakeholder: 'view' } },
  { feature: 'kitchen', allowed: { admin: 'view', kasir: 'view', dapur: 'full', stakeholder: 'view' } },
  { feature: 'orders', allowed: { admin: 'view', kasir: 'full', dapur: 'view', stakeholder: 'view' } },
  { feature: 'reservations', allowed: { admin: 'view', kasir: 'full' } },
  { feature: 'floorPlan', allowed: { admin: 'full', kasir: 'view' } },
  { feature: 'catalog', allowed: { admin: 'full' } },
  { feature: 'menuAvailability', allowed: { admin: 'full', kasir: 'full', dapur: 'full' } },
  { feature: 'finance', allowed: { admin: 'full', stakeholder: 'view' } },
]

let failures = 0
const rows: string[][] = []

for (const { feature, allowed } of EXPECTED) {
  for (const role of ROLES) {
    const want = allowed[role]
    // Boleh = minimal level yang diharapkan; jika tidak ada = harus ditolak total.
    const okView = want ? can(role, feature, 'view') : !can(role, feature, 'view')
    const okFull = want === 'full' ? can(role, feature, 'full') : !can(role, feature, 'full')
    const pass = okView && okFull
    if (!pass) failures++
    rows.push([
      feature,
      role,
      want ? want.toUpperCase() : '-',
      PERMISSIONS[feature][role],
      pass ? 'OK' : 'FAIL',
    ])
  }
}

const header = ['Fitur', 'Role', 'Harus', 'Aktual', 'Hasil']
const width = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)))
const fmt = (r: string[]) => r.map((c, i) => c.padEnd(width[i])).join(' | ')

console.log(fmt(header))
console.log(width.map((w) => '-'.repeat(w)).join('-+-'))
rows.forEach((r) => console.log(fmt(r)))
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} ketidaksesuaian dari ${rows.length} pemeriksaan.`)
process.exit(failures === 0 ? 0 : 1)