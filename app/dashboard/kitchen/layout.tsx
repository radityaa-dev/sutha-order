import { guardPage } from '@/lib/guard-page'
import { AppShell } from '../../../components/admin/app-shell'

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  // Dapur/Bar: semua role boleh lihat; ubah status butuh 'full' (dapur) di API.
  await guardPage('kitchen', 'view')
  return <AppShell>{children}</AppShell>
}