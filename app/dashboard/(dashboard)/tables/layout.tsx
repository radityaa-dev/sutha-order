import { guardPage } from '@/lib/guard-page'

export default async function TablesLayout({ children }: { children: React.ReactNode }) {
  await guardPage('floorPlan', 'view')
  return <>{children}</>
}