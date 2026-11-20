import { AdminSidebar } from './sidebar'
import { AdminTopbar } from './topbar'
import { IdleLogout } from './idle-logout'

/**
 * Shell tunggal untuk seluruh area staf.
 * Dipakai oleh /admin/* dan /dashboard/* agar sidebar + topbar selalu ada.
 * Tanpa ini, rute yang berada di luar route group kehilangan navigasi.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <IdleLogout />
      <AdminSidebar />
      <div className="flex min-h-screen w-full min-w-0 flex-1 flex-col pt-14 lg:pl-64 lg:pt-0">
        <AdminTopbar />
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}