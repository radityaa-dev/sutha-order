import { guardPage } from '@/lib/guard-page'

export default async function ShiftsLayout({ children }: { children: React.ReactNode }) {
  await guardPage('pos', 'full')
  return <>{children}</>
}