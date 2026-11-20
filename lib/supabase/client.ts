import { createBrowserClient } from '@supabase/ssr'
import { SESSION_MAX_AGE } from '../auth-config'

// Cookie options untuk browser client.
// Catatan: cookie yang dibaca @supabase/ssr di browser TIDAK boleh HttpOnly,
// karena library perlu membacanya untuk refresh token. Keamanan dijaga oleh
// SameSite + Secure (produksi) + nilai token yang tidak bisa ditebak.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        // domain & path dibiarkan default (host-only cookie).
      },
    }
  )
}

// Client realtime terpisah (tanpa attach session) — dipakai setelah sesi siap.
export const supabaseRealtime = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  }
)