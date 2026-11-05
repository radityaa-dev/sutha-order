'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { MenuIcon, LayoutDashboard, FolderIcon, UtensilsIcon, TableIcon, ShoppingBagIcon, LogOut } from 'lucide-react'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Kategori', href: '/admin/categories', icon: FolderIcon },
  { name: 'Menu', href: '/admin/menus', icon: UtensilsIcon },
  { name: 'Meja', href: '/admin/tables', icon: TableIcon },
  { name: 'Order', href: '/admin/orders', icon: ShoppingBagIcon },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logout berhasil')
    router.push('/admin/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Sutha Corner</h2>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <MenuIcon className="h-6 w-6" />
          </Button>
          <SheetContent side="left" className="p-0 w-64">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <h1 className="font-bold">Sutha Corner Admin</h1>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r bg-background">
        {sidebarContent}
      </aside>
    </>
  )
}
