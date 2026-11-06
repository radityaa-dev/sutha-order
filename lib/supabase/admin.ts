import { createClient } from '@supabase/supabase-js'

// Client untuk admin dengan RLS bypass (service role)
export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Client untuk realtime (harus anon key agar bisa mendengarkan perubahan)
export const supabaseRealtime = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
