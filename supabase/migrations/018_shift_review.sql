-- ============================================================
-- 018_shift_review.sql
-- Kolom peninjauan selisih kas shift + data demo flag
-- ============================================================

-- Kolom untuk menandai shift yang selisih kasnya sudah ditinjau admin
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES user_profiles(id);

CREATE INDEX IF NOT EXISTS idx_shifts_unreviewed_diff
  ON shifts(status, cash_difference)
  WHERE reviewed_at IS NULL;

-- Penanda data demo agar mudah dihapus (tidak memengaruhi data asli)
ALTER TABLE orders      ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE expenses    ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;
ALTER TABLE tables      ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_demo ON orders(is_demo) WHERE is_demo = true;