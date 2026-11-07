DROP POLICY IF EXISTS "Authenticated select orders" ON orders;
CREATE POLICY "Authenticated select orders" ON orders
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated select order_items" ON order_items;
CREATE POLICY "Authenticated select order_items" ON order_items
  FOR SELECT TO authenticated
  USING (true);
