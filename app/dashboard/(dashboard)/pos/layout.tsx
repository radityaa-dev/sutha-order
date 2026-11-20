import { guardPage } from '@/lib/guard-page'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  // POS = kasir saja (admin ditolak → beranda admin).
  await guardPage('pos', 'full')
  return <>{children}</>
}