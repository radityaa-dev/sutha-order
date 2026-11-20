import { guardPage } from '@/lib/guard-page'

export default async function AdminCategoriesLayout({ children }: { children: React.ReactNode }) {
  await guardPage('catalog', 'full')
  return <>{children}</>
}