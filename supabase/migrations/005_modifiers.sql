-- 1. Modifier Groups
CREATE TABLE IF NOT EXISTS modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  selection_type text CHECK (selection_type IN ('single', 'multiple')) NOT NULL,
  is_required bool DEFAULT false,
  min_select int DEFAULT 0,
  max_select int,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Modifier Options
CREATE TABLE IF NOT EXISTS modifier_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta int DEFAULT 0 CHECK (price_delta >= 0),
  is_available bool DEFAULT true,
  sort_order int DEFAULT 0
);

-- 3. Menu Modifier Groups (Junction Table)
CREATE TABLE IF NOT EXISTS menu_modifier_groups (
  menu_id uuid REFERENCES menus(id) ON DELETE CASCADE,
  group_id uuid REFERENCES modifier_groups(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  PRIMARY KEY (menu_id, group_id)
);

-- 4. Update order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS modifiers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS base_price int;

-- Enable RLS
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_modifier_groups ENABLE ROW LEVEL SECURITY;

-- Policies for modifier_groups
DROP POLICY IF EXISTS "Public select modifier_groups" ON modifier_groups;
CREATE POLICY "Public select modifier_groups" ON modifier_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin crud modifier_groups" ON modifier_groups;
CREATE POLICY "Admin crud modifier_groups" ON modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for modifier_options
DROP POLICY IF EXISTS "Public select modifier_options" ON modifier_options;
CREATE POLICY "Public select modifier_options" ON modifier_options FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin crud modifier_options" ON modifier_options;
CREATE POLICY "Admin crud modifier_options" ON modifier_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for menu_modifier_groups
DROP POLICY IF EXISTS "Public select menu_modifier_groups" ON menu_modifier_groups;
CREATE POLICY "Public select menu_modifier_groups" ON menu_modifier_groups FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin crud menu_modifier_groups" ON menu_modifier_groups;
CREATE POLICY "Admin crud menu_modifier_groups" ON menu_modifier_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
