import { guardPage } from '@/lib/guard-page'

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  await guardPage('finance', 'view')
  return <>{children}</>
}