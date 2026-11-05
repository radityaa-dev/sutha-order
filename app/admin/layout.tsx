import { AdminSidebar } from '../../components/admin/sidebar'

export const dynamic = 'force-dynamic'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AdminSidebar />
      <main className="lg:pl-64 pt-16 lg:pt-0">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
