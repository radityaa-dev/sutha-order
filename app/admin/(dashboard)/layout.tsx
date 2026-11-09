import { AdminSidebar } from '../../../components/admin/sidebar'
import { IdleLogout } from '../../../components/admin/idle-logout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <IdleLogout />
      <AdminSidebar />
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
