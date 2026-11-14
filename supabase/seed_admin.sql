-- ============================================================
-- seed_admin.sql
-- Sinkronisasi auth.users -> public.user_profiles
-- Jalankan di Supabase SQL Editor setelah user terdaftar di Auth
-- ============================================================

-- 1. Buat profil untuk semua user di auth.users yang belum punya profil
INSERT INTO public.user_profiles (id, full_name, email, role, is_active, auth_pin_hash, created_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'User') as full_name,
  au.email,
  CASE
    WHEN au.email = 'admin@example.com' THEN 'admin'
    ELSE 'stakeholder'
  END as role,
  true as is_active,
  NULL as auth_pin_hash,
  au.created_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.id = au.id
WHERE up.id IS NULL;

-- 2. Update user yang sudah punya profil tapi role null
UPDATE public.user_profiles
SET role = CASE
  WHEN email = 'admin@example.com' THEN 'admin'
  ELSE 'stakeholder'
END,
is_active = true
WHERE role IS NULL OR role = '';

-- 3. Opsional: Set admin user pertama jadi admin (ganti email sesuai kebutuhan)
-- UPDATE public.user_profiles
-- SET role = 'admin', is_active = true
-- WHERE email = 'your-admin-email@example.com';

-- 4. Verifikasi hasil
SELECT id, full_name, email, role, is_active, created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- 5. Buat trigger otomatis (optional - jalankan jika ingin otomatis saat user sign up)
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role, is_active, created_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email, 'User'),
    new.email,
    CASE WHEN new.email = 'admin@example.com' THEN 'admin' ELSE 'stakeholder' END,
    true,
    new.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/