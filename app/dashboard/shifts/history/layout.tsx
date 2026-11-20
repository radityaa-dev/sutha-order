import { guardPage } from '@/lib/guard-page'
import { AppShell } from '../../../../components/admin/app-shell'

export default async function ShiftHistoryLayout({ children }: { children: React.ReactNode }) {
  await guardPage('shiftHistory', 'view')
  return <AppShell>{children}</AppShell>
}