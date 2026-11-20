import { guardPage } from '@/lib/guard-page'

export default async function ReservationsLayout({ children }: { children: React.ReactNode }) {
  await guardPage('reservations', 'view')
  return <>{children}</>
}