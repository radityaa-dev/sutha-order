-- 1. Add access_token column to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS access_token TEXT;

-- 2. Backfill existing orders with secure tokens
UPDATE orders 
SET access_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') 
WHERE access_token IS NULL;

-- 3. Make it required and unique
ALTER TABLE orders ALTER COLUMN access_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_access_token ON orders(access_token);

-- 4. Drop old function and create new one with access_token support
-- Note: We need to maintain the SAME signature: create_order(text, text, text, jsonb)
-- Return type changes from TEXT to JSONB to return both code and token

DROP FUNCTION IF EXISTS create_order(text, text, text, jsonb);

CREATE OR REPLACE FUNCTION create_order(
  p_table_token TEXT,
  p_customer_name TEXT,
  p_notes TEXT,
  p_items JSONB
) RETURNS JSONB AS $$
DECLARE
  v_table_id UUID;
  v_order_id UUID;
  v_order_code TEXT;
  v_access_token TEXT;
  v_item RECORD;
  v_menu RECORD;
  v_opt RECORD;
  v_total_amount INT := 0;
  v_item_price INT;
  v_item_modifiers JSONB := '[]';
  v_group RECORD;
  v_selected_count INT;
  v_found_code BOOLEAN := TRUE;
  v_selected_option_ids UUID[];
BEGIN
  -- 1. Validasi Meja
  SELECT id INTO v_table_id FROM tables WHERE token = p_table_token AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meja tidak ditemukan'; END IF;

  -- 2. Generate Kode Order unik dengan retry
  WHILE v_found_code LOOP
    v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = v_order_code) INTO v_found_code;
  END LOOP;

  -- 3. Generate Access Token (kriptografis)
  v_access_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  -- 4. Insert Order
  INSERT INTO orders (order_code, access_token, table_id, customer_name, notes, total, order_status, payment_status)
  VALUES (v_order_code, v_access_token, v_table_id, p_customer_name, p_notes, 0, 'pending', 'pending')
  RETURNING id INTO v_order_id;

  -- 5. Loop items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    menu_id UUID, 
    qty INT, 
    notes TEXT,
    option_ids UUID[]
  )
  LOOP
    -- Ambil menu dan validasi ketersediaan
    SELECT * INTO v_menu FROM menus WHERE id = v_item.menu_id AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu tidak tersedia'; END IF;

    v_item_price := v_menu.price;
    v_item_modifiers := '[]'::jsonb;
    v_selected_option_ids := COALESCE(v_item.option_ids, '{}'::UUID[]);

    -- Validasi setiap grup add-on yang terpasang pada menu
    FOR v_group IN 
      SELECT mg.* FROM modifier_groups mg 
      JOIN menu_modifier_groups mmg ON mg.id = mmg.group_id 
      WHERE mmg.menu_id = v_item.menu_id
    LOOP
      -- Hitung opsi terpilih dari grup ini yang valid
      SELECT count(*) INTO v_selected_count 
      FROM modifier_options 
      WHERE id = ANY(v_selected_option_ids) 
        AND group_id = v_group.id 
        AND is_available = true;

      -- Validasi wajib & kuota
      IF v_group.is_required AND v_selected_count < COALESCE(v_group.min_select, 1) THEN
        RAISE EXCEPTION 'Menu % wajib memilih %', v_menu.name, v_group.name;
      END IF;
      IF v_group.max_select IS NOT NULL AND v_selected_count > v_group.max_select THEN
        RAISE EXCEPTION 'Menu % melebihi batas pilihan %', v_menu.name, v_group.name;
      END IF;

      -- Tambahkan opsi ke snapshot dan hitung harga
      FOR v_opt IN SELECT * FROM modifier_options WHERE id = ANY(v_selected_option_ids) AND group_id = v_group.id
      LOOP
        v_item_price := v_item_price + v_opt.price_delta;
        v_item_modifiers := v_item_modifiers || jsonb_build_object(
          'group_name', v_group.name, 
          'option_name', v_opt.name, 
          'price_delta', v_opt.price_delta
        );
      END LOOP;
    END LOOP;

    INSERT INTO order_items (order_id, menu_id, menu_name, base_price, price, qty, notes, modifiers)
    VALUES (v_order_id, v_menu.id, v_menu.name, v_menu.price, v_item_price, v_item.qty, v_item.notes, v_item_modifiers);
    
    v_total_amount := v_total_amount + (v_item_price * v_item.qty);
  END LOOP;

  UPDATE orders SET total = v_total_amount WHERE id = v_order_id;
  
  -- Return both order_code and access_token
  RETURN jsonb_build_object('order_code', v_order_code, 'access_token', v_access_token);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION create_order(text, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_order(text, text, text, jsonb) TO service_role;