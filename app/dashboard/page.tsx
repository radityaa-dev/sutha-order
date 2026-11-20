import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'

export default async function DashboardRootPage() {
  try {
    const user = await getSessionUser()

    if (user.role === 'kasir') {
      redirect('/dashboard/pos')
    } else if (user.role === 'dapur') {
      redirect('/dashboard/kitchen')
    } else if (user.role === 'stakeholder') {
      redirect('/dashboard/reports')
    } else {
      redirect('/dashboard/overview')
    }
  } catch {
    redirect('/login')
  }
}