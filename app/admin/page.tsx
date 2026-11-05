import { requireAdmin } from '../../lib/auth'

export default async function AdminPage() {
  const user = await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Selamat datang, {user.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Total Order</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Total Menu</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="p-6 border rounded-lg">
          <h3 className="text-sm font-medium text-muted-foreground">Total Meja</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
      </div>
    </div>
  )
}
