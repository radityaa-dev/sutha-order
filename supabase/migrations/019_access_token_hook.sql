-- ============================================================
-- 019_access_token_hook.sql
-- Menyisipkan role & status aktif ke klaim JWT.
--
-- Efek: middleware cukup memverifikasi tanda tangan JWT (lokal, ~2 ms)
-- tanpa query user_profiles sama sekali. Setiap request terproteksi
-- turun dari ~700 ms menjadi mendekati nol round-trip ke database.
--
-- WAJIB diaktifkan di Dashboard setelah migration ini dijalankan:
--   Authentication → Hooks → "Customize Access Token (JWT) Claims"
--   → pilih public.custom_access_token_hook → Enable
-- Tanpa langkah itu, klaim belum ditambahkan (aplikasi tetap jalan,
-- hanya kembali memakai query database).
-- ============================================================

-- Fungsi dipanggil Auth saat menerbitkan token. Argumennya ditetapkan Supabase.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  profile record;
BEGIN
  claims := coalesce(event->'claims', '{}'::jsonb);

  SELECT role, is_active
    INTO profile
    FROM public.user_profiles
   WHERE id = (event->>'user_id')::uuid;

  IF profile.role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.role));
    claims := jsonb_set(claims, '{user_active}', to_jsonb(coalesce(profile.is_active, false)));
  ELSE
    -- Profil tidak ada: tandai nonaktif agar middleware menolak.
    claims := jsonb_set(claims, '{user_active}', 'false'::jsonb);
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Hanya Auth yang boleh memanggilnya.
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Auth perlu membaca profil untuk mengisi klaim.
GRANT SELECT ON TABLE public.user_profiles TO supabase_auth_admin;

-- Kebijakan agar supabase_auth_admin bisa membaca baris profil.
DROP POLICY IF EXISTS "Auth admin reads profiles for claims" ON public.user_profiles;
CREATE POLICY "Auth admin reads profiles for claims"
  ON public.user_profiles
  AS PERMISSIVE
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

-- Bersihkan kebijakan lama bila pernah dibuat dengan nama berbeda.
DROP POLICY IF EXISTS "Auth admin can read all profiles" ON public.user_profiles;

-- Pastikan RLS tetap aktif (defense in depth).
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;