import { guardPage } from '@/lib/guard-page'
import { AppShell } from '../../../components/admin/app-shell'

export default async function OverviewLayout({ children }: { children: React.ReactNode }) {
  await guardPage('finance', 'full')
  return <AppShell>{children}</AppShell>
}