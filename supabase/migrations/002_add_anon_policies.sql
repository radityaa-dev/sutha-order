-- Migration: Tambahkan RLS untuk anon
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read categories" ON categories;
CREATE POLICY "Public can read categories" ON categories FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read menus" ON menus;
CREATE POLICY "Public can read menus" ON menus FOR SELECT TO anon, authenticated USING (true);
