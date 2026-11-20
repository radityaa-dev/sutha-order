import { getTableByToken, getPublishedMenus, getActiveOrdersForTable } from './actions'
import { CartSheet } from '../../../components/customer/cart-sheet'
import { MenuBrowser } from '../../../components/customer/menu-browser'
import { ActiveOrderBanner } from '../../../components/customer/active-order-banner'

export const dynamic = 'force-dynamic'

export default async function CustomerMenuPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const table = await getTableByToken(token)

  if (!table) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="type-title text-[18px] text-ink">QR tidak dikenali</h1>
        <p className="max-w-[32ch] text-[13px] leading-relaxed text-ink-muted">
          Meja ini tidak aktif atau kode QR sudah diganti. Panggil staf untuk memesan.
        </p>
      </div>
    )
  }

  const [menus, activeOrders] = await Promise.all([
    getPublishedMenus(),
    getActiveOrdersForTable(table.id),
  ])

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-background pb-28">
      <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-background/95 px-4 pb-2.5 pt-3 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="type-title text-[19px] text-ink">Sutha Corner</h1>
          <p className="type-label shrink-0 rounded-[var(--radius-sm)] bg-[var(--surface-sunken)] px-2 py-1 text-[12px] text-ink-muted">
            {table.name}
          </p>
        </div>
        {activeOrders.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {activeOrders.map((o) => (
              <ActiveOrderBanner key={o.orderCode} order={o} />
            ))}
          </div>
        )}
      </header>

      <div className="px-4 pb-2 pt-3">
        <MenuBrowser menus={menus as any} />
      </div>

      <CartSheet token={token} />
    </div>
  )
}