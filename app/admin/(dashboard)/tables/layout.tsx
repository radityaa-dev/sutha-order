import { guardPage } from '@/lib/guard-page'

export default async function AdminTablesLayout({ children }: { children: React.ReactNode }) {
  // QR meja & token: katalog admin-only.
  await guardPage('catalog', 'full')
  return <>{children}</>
}