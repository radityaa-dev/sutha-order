import { guardPage } from '@/lib/guard-page'

export default async function LogsLayout({ children }: { children: React.ReactNode }) {
  await guardPage('finance', 'view')
  return <>{children}</>
}