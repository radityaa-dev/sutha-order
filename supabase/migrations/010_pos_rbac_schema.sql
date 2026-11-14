-- ============================================================
-- 010_pos_rbac_schema.sql
-- FASE 1: POS & RBAC Schema Expansion
-- Sutha Corner Hybrid POS + QR Ordering Upgrade
-- ============================================================

-- pgcrypto untuk hashing PIN (crypt/gen_salt) di RPC
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1. user_profiles (link ke auth.users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'kasir', 'dapur', 'stakeholder')),
  auth_pin_hash text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Setiap pengguna hanya bisa membaca profilnya sendiri (untuk RBAC middleware/action).
-- Insert/update/delete hanya via service_role (bypass RLS).
DROP POLICY IF EXISTS "Read own profile" ON user_profiles;
CREATE POLICY "Read own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ------------------------------------------------------------
-- 2. store_settings (single-row config)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tax_percentage numeric(5,2) DEFAULT 0,
  online_payment_timeout_minutes int DEFAULT 15,
  reservation_grace_minutes int DEFAULT 30
);

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read store settings" ON store_settings;
CREATE POLICY "Read store settings" ON store_settings
  FOR SELECT TO authenticated
  USING (true);

-- Seed baris tunggal
INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. ALTER categories
-- ------------------------------------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS station text NOT NULL DEFAULT 'dapur'
  CHECK (station IN ('dapur', 'bar'));

-- ------------------------------------------------------------
-- 4. ALTER menus
-- ------------------------------------------------------------
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_seasonal boolean DEFAULT false;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS seasonal_start date;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS seasonal_end date;

-- ------------------------------------------------------------
-- 5. bundles & bundle_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES menus(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 1
);

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select bundles" ON bundles;
CREATE POLICY "Public select bundles" ON bundles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public select bundle_items" ON bundle_items;
CREATE POLICY "Public select bundle_items" ON bundle_items FOR SELECT USING (true);

-- ------------------------------------------------------------
-- 6. ALTER tables
-- ------------------------------------------------------------
ALTER TABLE tables ADD COLUMN IF NOT EXISTS area text DEFAULT 'main'
  CHECK (area IN ('main', 'vip', 'bar', 'outdoor'));
ALTER TABLE tables ADD COLUMN IF NOT EXISTS capacity int DEFAULT 4;
ALTER TABLE tables ADD COLUMN IF NOT EXISTS status text DEFAULT 'kosong'
  CHECK (status IN ('kosong', 'terisi', 'dipesan'));

-- ------------------------------------------------------------
-- 7. shifts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  opened_at timestamptz DEFAULT now(),
  opening_cash numeric NOT NULL DEFAULT 0,
  closed_at timestamptz,
  total_cash numeric DEFAULT 0,
  total_non_cash numeric DEFAULT 0,
  counted_cash numeric,
  cash_difference numeric,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read shifts" ON shifts;
CREATE POLICY "Read shifts" ON shifts FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- 8. ALTER orders
-- ------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS short_number int;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_source text NOT NULL DEFAULT 'qr_table'
  CHECK (order_source IN ('qr_table', 'pos_cashier'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS serving_method text NOT NULL DEFAULT 'ambil_sendiri'
  CHECK (serving_method IN ('ambil_sendiri', 'antar_meja', 'antar_gedung'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'bayar_sekarang'
  CHECK (payment_mode IN ('bayar_sekarang', 'open_bill'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS open_bill_status text DEFAULT 'none'
  CHECK (open_bill_status IN ('none', 'pending_approval', 'approved'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_approved_by uuid REFERENCES user_profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_order_id uuid REFERENCES orders(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES user_profiles(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Backfill short_number untuk order lama (per hari, urut created_at)
UPDATE orders o
SET short_number = numbered.rn
FROM (
  SELECT id, row_number() OVER (PARTITION BY created_at::date ORDER BY created_at) AS rn
  FROM orders
  WHERE short_number IS NULL
) numbered
WHERE o.id = numbered.id;

-- Jadikan NOT NULL setelah backfill
ALTER TABLE orders ALTER COLUMN short_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_short_number ON orders(short_number);
CREATE INDEX IF NOT EXISTS idx_orders_open_bill ON orders(open_bill_status);
CREATE INDEX IF NOT EXISTS idx_orders_parent ON orders(parent_order_id);

-- ------------------------------------------------------------
-- 9. ALTER order_items
-- ------------------------------------------------------------
-- menu_id menjadi nullable untuk item bundle
ALTER TABLE order_items ALTER COLUMN menu_id DROP NOT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES bundles(id);

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS chk_order_item_menu_or_bundle;
ALTER TABLE order_items ADD CONSTRAINT chk_order_item_menu_or_bundle
  CHECK (menu_id IS NOT NULL OR bundle_id IS NOT NULL);

-- ------------------------------------------------------------
-- 10. ALTER payments
-- ------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS method text DEFAULT 'xendit_online'
  CHECK (method IN ('xendit_online', 'cash', 'qris_manual', 'transfer', 'edc_card'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES shifts(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES user_profiles(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_received numeric;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS change_amount numeric;

-- ------------------------------------------------------------
-- 11. void_logs, reservations, expenses, activity_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS void_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES user_profiles(id),
  approved_by uuid REFERENCES user_profiles(id),
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES tables(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  pax_count int NOT NULL,
  booking_time timestamptz NOT NULL,
  status text DEFAULT 'dipesan' CHECK (status IN ('dipesan', 'hadir', 'batal', 'tidak_hadir')),
  notes text,
  created_by uuid REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  recorded_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE void_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read void_logs" ON void_logs;
CREATE POLICY "Read void_logs" ON void_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Read reservations" ON reservations;
CREATE POLICY "Read reservations" ON reservations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Read expenses" ON expenses;
CREATE POLICY "Read expenses" ON expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Read activity_logs" ON activity_logs;
CREATE POLICY "Read activity_logs" ON activity_logs FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- 12. Helper: catat aktivitas (dipakai berbagai RPC)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id uuid,
  p_action text,
  p_entity text,
  p_entity_id text,
  p_details jsonb DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action, entity, entity_id, details)
  VALUES (p_user_id, p_action, p_entity, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION log_activity(uuid, text, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION log_activity(uuid, text, text, text, jsonb) TO service_role;
