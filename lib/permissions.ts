import { type Role } from './auth'

/** Level akses sebuah fitur. 'none' = tidak boleh melihat maupun memanggil. */
export type AccessLevel = 'full' | 'view' | 'none'

export const ROLES: Role[] = ['admin', 'kasir', 'dapur', 'stakeholder']

/**
 * Satu sumber kebenaran hak akses.
 * Matriks: admin / kasir / dapur / stakeholder.
 * 'full' = boleh mengubah, 'view' = hanya melihat, 'none' = ditolak.
 */
export const PERMISSIONS = {
  // Kasir POS, terima pembayaran, struk, open bill, pindah/split/gabung,
  // ajukan diskon/void, buka-tutup shift sendiri, serahkan pesanan.
  pos: { admin: 'none', kasir: 'full', dapur: 'none', stakeholder: 'none' },
  // Setujui diskon/void (PIN), refund, order bermasalah.
  approval: { admin: 'full', kasir: 'none', dapur: 'none', stakeholder: 'none' },
  // Riwayat shift semua kasir dan selisih kas.
  shiftHistory: { admin: 'full', kasir: 'none', dapur: 'none', stakeholder: 'view' },
  // Layar dapur/bar dan ubah status Diproses -> Siap.
  kitchen: { admin: 'view', kasir: 'view', dapur: 'full', stakeholder: 'view' },
  // Daftar order masuk.
  orders: { admin: 'view', kasir: 'full', dapur: 'view', stakeholder: 'view' },
  // Reservasi meja.
  reservations: { admin: 'view', kasir: 'full', dapur: 'none', stakeholder: 'none' },
  // Denah dan status meja.
  floorPlan: { admin: 'full', kasir: 'view', dapur: 'none', stakeholder: 'none' },
  // Menu, kategori, add-on, bundle, QR meja, pengaturan, pengguna dan PIN.
  catalog: { admin: 'full', kasir: 'none', dapur: 'none', stakeholder: 'none' },
  // Toggle ketersediaan menu (pengecualian: kasir & dapur boleh).
  menuAvailability: { admin: 'full', kasir: 'full', dapur: 'full', stakeholder: 'none' },
  // Pengeluaran, laporan, ekspor, log aktivitas, log void.
  finance: { admin: 'full', kasir: 'none', dapur: 'none', stakeholder: 'view' },
} as const satisfies Record<string, Record<Role, AccessLevel>>

export type Feature = keyof typeof PERMISSIONS

const RANK: Record<AccessLevel, number> = { none: 0, view: 1, full: 2 }

/** true jika role punya minimal level yang diminta untuk fitur. */
export function can(role: Role, feature: Feature, level: 'view' | 'full' = 'view'): boolean {
  const granted = PERMISSIONS[feature][role]
  return RANK[granted] >= RANK[level]
}

export function accessLevel(role: Role, feature: Feature): AccessLevel {
  return PERMISSIONS[feature][role]
}

/** Halaman tujuan pertama setelah login. */
export function roleHome(role: Role): string {
  switch (role) {
    case 'kasir':
      return '/dashboard/pos'
    case 'dapur':
      return '/dashboard/kitchen'
    case 'stakeholder':
      return '/dashboard/reports'
    default:
      return '/dashboard/overview'
  }
}

export interface NavEntry {
  feature: Feature
  name: string
  href: string
  /** Level minimum untuk menampilkan menu. */
  level: 'view' | 'full'
  badge?: string
}

export interface NavGroup {
  title: string
  items: NavEntry[]
}

/** Menu sidebar, diurutkan per grup. Href sesuai rute yang benar-benar ada. */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Utama',
    items: [
      { feature: 'finance', name: 'Beranda', href: '/dashboard/overview', level: 'view' },
      { feature: 'finance', name: 'Metrik bisnis', href: '/admin', level: 'view' },
      { feature: 'pos', name: 'Kasir POS', href: '/dashboard/pos', level: 'full', badge: 'Live' },
      { feature: 'pos', name: 'Shift Saya', href: '/dashboard/shifts', level: 'full' },
      { feature: 'shiftHistory', name: 'Monitor Kasir', href: '/dashboard/monitor', level: 'view' },
      { feature: 'shiftHistory', name: 'Riwayat Shift', href: '/dashboard/shifts/history', level: 'view' },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { feature: 'orders', name: 'Order Masuk', href: '/admin/orders', level: 'view' },
      { feature: 'floorPlan', name: 'Meja & Denah', href: '/dashboard/tables', level: 'view' },
      { feature: 'reservations', name: 'Reservasi', href: '/dashboard/reservations', level: 'view' },
      { feature: 'kitchen', name: 'Dapur & Bar', href: '/dashboard/kitchen', level: 'view' },
    ],
  },
  {
    title: 'Katalog',
    items: [
      { feature: 'catalog', name: 'Menu', href: '/admin/menus', level: 'full' },
      { feature: 'catalog', name: 'Kategori', href: '/admin/categories', level: 'full' },
      { feature: 'catalog', name: 'Add-on', href: '/admin/modifiers', level: 'full' },
      { feature: 'catalog', name: 'Paket Bundle', href: '/dashboard/bundles', level: 'full' },
    ],
  },
  {
    title: 'Keuangan & Sistem',
    items: [
      { feature: 'finance', name: 'Pengeluaran', href: '/dashboard/expenses', level: 'view' },
      { feature: 'finance', name: 'Laporan', href: '/dashboard/reports', level: 'view' },
      { feature: 'catalog', name: 'Staf', href: '/dashboard/users', level: 'full' },
      { feature: 'finance', name: 'Log Audit', href: '/dashboard/logs', level: 'view' },
    ],
  },
]

/** Menu yang boleh dilihat role ini. */
export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(role, item.feature, item.level)),
    }))
    .filter((group) => group.items.length > 0)
}
