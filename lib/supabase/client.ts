import { createBrowserClient } from '@supabase/ssr'
import { SESSION_MAX_AGE } from '../auth-config'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      }
    }
  )
}

export const supabaseRealtime = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
