import { guardPage } from '@/lib/guard-page'

export default async function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  // Daftar order masuk: kasir full, semua role lain view.
  await guardPage('orders', 'view')
  return <>{children}</>
}