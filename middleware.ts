import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SESSION_MAX_AGE } from './lib/auth-config'

// Role types
type Role = 'admin' | 'kasir' | 'dapur' | 'stakeholder'

// Define route access rules
const ROUTE_ACCESS: Record<string, (Role | '*')[]> = {
    '/admin': ['admin'],
    '/admin/categories': ['admin'],
    '/admin/menus': ['admin', 'kasir', 'dapur', 'stakeholder'],
    '/admin/modifiers': ['admin', 'kasir'],
    '/admin/orders': ['admin', 'kasir', 'dapur', 'stakeholder'],
    '/admin/tables': ['admin', 'kasir'],
    '/dashboard': ['admin', 'kasir', 'dapur', 'stakeholder'],
    '/dashboard/overview': ['admin'],
    '/dashboard/pos': ['kasir'],
    '/dashboard/shifts/history': ['admin', 'stakeholder'],
    '/dashboard/shifts': ['kasir'],
    '/dashboard/monitor': ['admin', 'stakeholder'],
    '/dashboard/tables': ['admin', 'kasir'],
    '/dashboard/reservations': ['admin', 'kasir'],
    '/dashboard/bundles': ['admin'],
    '/dashboard/expenses': ['admin', 'stakeholder'],
    '/dashboard/reports': ['admin', 'stakeholder'],
    '/dashboard/kitchen': ['admin', 'kasir', 'dapur', 'stakeholder'],
    '/dashboard/logs': ['admin', 'stakeholder'],
    '/dashboard/users': ['admin'],
    '/m': ['*'],
    '/order': ['*'],
    '/queue': ['*'],
}

function isRouteProtected(pathname: string): boolean {
    const rules = rulesFor(pathname)
    // Rute dengan '*' adalah publik (mis. /m, /order, /queue): jangan minta login.
    if (!rules || rules.includes('*')) return false
    return true
}

/** Ambil aturan dengan prefix terpanjang yang cocok (mis. /dashboard/shifts/history sebelum /dashboard/shifts). */
function rulesFor(pathname: string): (Role | '*')[] | null {
    let best: string | null = null
    for (const route of Object.keys(ROUTE_ACCESS)) {
        const hit = pathname === route || pathname.startsWith(route + '/')
        if (hit && (best === null || route.length > best.length)) best = route
    }
    return best ? ROUTE_ACCESS[best] : null
}

/** Beranda per role. */
function roleHomePath(role: Role): string {
    switch (role) {
        case 'kasir': return '/dashboard/pos'
        case 'dapur': return '/dashboard/kitchen'
        case 'stakeholder': return '/dashboard/reports'
        default: return '/dashboard/overview'
    }
}

/** Header identitas yang HANYA boleh diisi middleware. */
const IDENTITY_HEADERS = [
    'x-user-id', 'x-user-email', 'x-user-role', 'x-user-active', 'x-user-name',
]

/** Buang header identitas kiriman klien sebelum dipakai/diteruskan. */
function stripIdentityHeaders(headers: Headers) {
    IDENTITY_HEADERS.forEach((h) => headers.delete(h))
    headers.delete('x-user-forged')
}

/**
 * Teruskan identitas terverifikasi ke Server Component lewat header,
 * supaya layout/action tidak mengulang auth.getUser() + query profil.
 */
function withIdentityHeaders(
    request: NextRequest,
    supabaseResponse: NextResponse,
    user: { id: string; email: string; role: Role; fullName: string }
): NextResponse {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-email', user.email ?? '')
    requestHeaders.set('x-user-role', user.role)
    requestHeaders.set('x-user-active', '1')
    // Nama bisa non-ASCII: base64 agar aman di header.
    requestHeaders.set('x-user-name', Buffer.from(user.fullName ?? '', 'utf8').toString('base64'))

    const forwarded = NextResponse.next({ request: { headers: requestHeaders } })
    supabaseResponse.cookies.getAll().forEach((cookie) => forwarded.cookies.set(cookie))
    return forwarded
}

/**
 * Buat respons redirect yang MENYALIN cookie hasil refresh dari supabaseResponse.
 * Pola resmi @supabase/ssr: jangan pernah redirect tanpa menyalin cookie.
 */
function redirectWithCookies(
    request: NextRequest,
    supabaseResponse: NextResponse,
    location: string
): NextResponse {
    const redirectResponse = NextResponse.redirect(new URL(location, request.url))
    supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip rute non-halaman & aset
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/icon') ||
        pathname.startsWith('/apple-icon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Header identitas kiriman klien tidak pernah dipercaya.
    stripIdentityHeaders(request.headers)

    // Pola resmi: buat supabaseResponse lebih dulu, semua set cookie ditulis ke sana.
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            maxAge: SESSION_MAX_AGE,
                        })
                    )
                },
            },
            cookieOptions: {
                maxAge: SESSION_MAX_AGE,
            },
        }
    )

    // Verifikasi JWT secara lokal (JWKS di-cache): ~2-3 ms, bukan ~200-500 ms.
    // getClaims() TIDAK memanggil server Auth bila kunci sudah di-cache; token
    // tetap diverifikasi tanda tangannya, jadi tidak sekadar membaca cookie.
    const { data: claimsData } = await supabase.auth.getClaims()
    const claims = claimsData?.claims as Record<string, any> | undefined
    const user = claims?.sub
        ? { id: claims.sub as string, email: (claims.email as string) || '' }
        : null

    const isLoginPath = pathname === '/login'
    const isProtected = isRouteProtected(pathname) && !isLoginPath

    // Klaim dari JWT (diisi hook 019). Bila hook belum aktif, nilainya kosong
    // dan kita jatuh ke query database seperti sebelumnya.
    const claimRole = (claims?.user_role as Role | undefined) ?? null
    const claimActive = claims?.user_active
    const claimName = (claims?.full_name as string | undefined) ?? ''

    // Case 1: Sudah login & buka halaman login → redirect sesuai role.
    if (user && isLoginPath) {
        let role: Role = claimRole ?? 'admin'
        if (!claimRole) {
            const { data: p } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
            role = ((p?.role as Role) ?? 'admin')
        }
        return redirectWithCookies(request, supabaseResponse, roleHomePath(role))
    }

    // Case 2: Belum login & akses halaman protected → redirect login (dengan cookie).
    if (!user && isProtected) {
        return redirectWithCookies(request, supabaseResponse, '/login')
    }

    // Case 3: Sudah login & akses protected → cek RBAC.
    if (user && isProtected) {
        // Jalur cepat: klaim JWT sudah membawa role + status aktif → 0 query.
        if (claimRole && typeof claimActive === 'boolean') {
            if (!claimActive) {
                return redirectWithCookies(request, supabaseResponse, '/login?error=inactive')
            }
            const roles = rulesFor(pathname) || ['admin']
            if (!roles.includes('*') && !roles.includes(claimRole)) {
                return redirectWithCookies(request, supabaseResponse, roleHomePath(claimRole))
            }
            return withIdentityHeaders(request, supabaseResponse, {
                id: user.id,
                email: user.email,
                role: claimRole,
                fullName: claimName,
            })
        }

        // Jalur cadangan: hook belum aktif → query profil seperti semula.
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('full_name, email, role, is_active')
            .eq('id', user.id)
            .maybeSingle()

        if (!profileError) {
            if (!profile) {
                return redirectWithCookies(request, supabaseResponse, '/login?error=profile_not_found')
            }

            if (!profile.is_active) {
                return redirectWithCookies(request, supabaseResponse, '/login?error=inactive')
            }

            const role = profile.role as Role
            const roles = rulesFor(pathname) || ['admin']
            if (!roles.includes('*') && !roles.includes(role)) {
                return redirectWithCookies(request, supabaseResponse, roleHomePath(role))
            }

            return withIdentityHeaders(request, supabaseResponse, {
                id: user.id,
                email: user.email,
                role,
                fullName: profile.full_name ?? '',
            })
        }
    }

    // Tidak ada redirect: kembalikan supabaseResponse agar cookie refresh ikut terkirim.
    return supabaseResponse
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}