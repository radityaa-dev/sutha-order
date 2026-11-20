import { guardPage } from '@/lib/guard-page'

export default async function BundlesLayout({ children }: { children: React.ReactNode }) {
  await guardPage('catalog', 'full')
  return <>{children}</>
}