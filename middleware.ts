import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SESSION_MAX_AGE } from './lib/auth-config'

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

  let response = NextResponse.next({
    request,
  })

  // Prevent caching for admin routes
  if (pathname.startsWith('/admin')) {
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
            response = NextResponse.next({
              request,
            })
            response.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE,
            })
          })
        },
      },
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      }
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Case 1: Already logged in and trying to visit /admin/login
  if (user && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Case 2: Visiting protected /admin route without being logged in
  if (!user && pathname.startsWith('/admin') && pathname !== '/admin/login') {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/admin/login'],
}
