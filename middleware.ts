import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SESSION_MAX_AGE } from './lib/auth-config'
import { adminClient } from './lib/supabase/admin'
import { homePathForRole, type Role } from './lib/auth'

// RBAC: role apa saja yang boleh mengakses tiap path prefix.
// 'admin' = semua; kosong = semua role login boleh.
const ROUTE_ACCESS: { prefix: string; roles: Role[] }[] = [
  // Dashboard analytics: admin full, kasir/dapur di-redirect, stakeholder read-only
  { prefix: '/dashboard', roles: ['admin', 'kasir', 'dapur', 'stakeholder'] },
  { prefix: '/dashboard/pos', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/tables', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/shifts', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/kitchen', roles: ['admin', 'kasir', 'dapur', 'stakeholder'] },
  { prefix: '/dashboard/orders', roles: ['admin', 'kasir', 'dapur', 'stakeholder'] },
  { prefix: '/dashboard/menus', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/categories', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/modifiers', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/bundles', roles: ['admin', 'kasir'] },
  { prefix: '/dashboard/expenses', roles: ['admin', 'stakeholder'] },
  { prefix: '/dashboard/reports', roles: ['admin', 'stakeholder'] },
  { prefix: '/dashboard/users', roles: ['admin'] },
  { prefix: '/dashboard/logs', roles: ['admin'] },
  // Route lama (legacy /admin/*) untuk sementara: semua role login boleh
  { prefix: '/admin', roles: ['admin', 'kasir', 'dapur', 'stakeholder'] },
]

function allowedRoles(pathname: string): Role[] | null {
  const match = ROUTE_ACCESS.find((r) => pathname.startsWith(r.prefix))
  return match ? match.roles : null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files, api/xendit/webhook, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/xendit') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  // Prevent caching for admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE,
            })
          })
        },
      },
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPath = pathname === '/admin/login'
  const isProtected =
    pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

  // Case 1: Sudah login dan mencoba ke halaman login -> redirect sesuai role
  if (user && isLoginPath) {
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Profil tidak ditemukan, logout dan redirect ke login
      const signOutUrl = new URL('/admin/login', request.url)
      signOutUrl.searchParams.set('error', 'profile_not_found')
      const resp = NextResponse.redirect(signOutUrl)
      // Hapus session cookie
      resp.cookies.delete('sb-access-token')
      resp.cookies.delete('sb-refresh-token')
      return resp
    }

    const role = (profile?.role ?? 'stakeholder') as Role
    return NextResponse.redirect(new URL(homePathForRole(role), request.url))
  }

  // Case 2: Belum login & akses halaman protected -> redirect login
  if (!user && isProtected && !isLoginPath) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Case 3: Sudah login & akses halaman protected -> cek RBAC
  if (user && isProtected) {
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Profil tidak ditemukan, logout
      const signOutUrl = new URL('/admin/login', request.url)
      signOutUrl.searchParams.set('error', 'profile_not_found')
      const resp = NextResponse.redirect(signOutUrl)
      resp.cookies.delete('sb-access-token')
      resp.cookies.delete('sb-refresh-token')
      return resp
    }

    const role = (profile?.role ?? 'stakeholder') as Role

    if (!profile?.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const roles = allowedRoles(pathname)
    if (roles && !roles.includes(role)) {
      // Role tidak berhak -> arahkan ke home role-nya
      return NextResponse.redirect(new URL(homePathForRole(role), request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/admin/login', '/dashboard/:path*'],
}
