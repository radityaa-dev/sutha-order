import { AdminSidebar } from '../../../components/admin/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0">{children}</main>
    </div>
  )
}
