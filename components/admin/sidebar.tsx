'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { Button } from '../ui/button'
import { Sheet, SheetContent } from '../ui/sheet'
import { cn } from '../../lib/utils'
import { navForRole } from '../../lib/permissions'
import type { Role } from '../../lib/auth'
import {
  LayoutDashboard, MonitorIcon, ClockIcon, ShoppingBagIcon, TableIcon,
  CalendarIcon, CookingPot, UtensilsIcon, FolderIcon, MenuIcon, Package,
  DollarSign, BarChart2, UsersIcon, FileText, LogOut, MenuIcon as MenuOpen,
  type LucideIcon,
} from 'lucide-react'

// Ikon per href (dipetakan dari lib/permissions navForRole).
const ICONS: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/pos': MonitorIcon,
  '/dashboard/shifts': ClockIcon,
  '/dashboard/monitor': UsersIcon,
  '/dashboard/shifts/history': ClockIcon,
  '/admin/orders': ShoppingBagIcon,
  '/dashboard/tables': TableIcon,
  '/dashboard/reservations': CalendarIcon,
  '/dashboard/kitchen': CookingPot,
  '/admin/menus': UtensilsIcon,
  '/admin/categories': FolderIcon,
  '/admin/modifiers': MenuIcon,
  '/dashboard/bundles': Package,
  '/dashboard/expenses': DollarSign,
  '/dashboard/reports': BarChart2,
  '/dashboard/users': UsersIcon,
  '/dashboard/logs': FileText,
}

export function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<string>('admin')

  // Satu permintaan ringan; identitas sudah diverifikasi di server.
  useEffect(() => {
    let active = true
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.role) setRole(d.role) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/')
  }

  function isActive(href: string): boolean {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[var(--canvas)]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--line)]">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/sutha-logo.png" alt="Sutha Corner" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">Sutha Corner</p>
          <p className="truncate text-[11px] text-ink-faint">Admin Panel</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="sutha-scroll flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navForRole(role as Role).map((group) => {
          return (
            <div key={group.title}>
              <p className="sutha-label px-2 pb-2">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = ICONS[item.href] || LayoutDashboard
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'sutha-pill-active'
                          : 'text-ink/80 hover:bg-[var(--surface-sunken)] hover:text-ink'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-[var(--brand-700)]')} />
                      <span className="flex-1 truncate">{item.name}</span>
                      {item.badge && (
                        <span className={cn(
                          'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                          active ? 'bg-white/20 text-white' : 'bg-[var(--brand-100)] text-[var(--brand-700)]'
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-[var(--line)] p-3">
        <Button
          variant="ghost"
          className="h-11 w-full justify-start rounded-[var(--radius-sm)] text-ink hover:bg-[var(--surface-sunken)]"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2.5 text-[var(--brand-700)]" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--canvas)]/90 px-4 backdrop-blur">
        <Sheet open={open} onOpenChange={setOpen}>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setOpen(true)} aria-label="Buka menu">
            <MenuOpen className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <p className="font-semibold text-ink">Sutha Corner</p>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r border-[var(--line)]">
        {sidebarContent}
      </aside>
    </>
  )
}