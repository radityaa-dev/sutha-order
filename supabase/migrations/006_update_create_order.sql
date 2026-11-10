-- Update create_order function to handle modifiers and base_price
CREATE OR REPLACE FUNCTION create_order(
  p_table_token TEXT,
  p_customer_name TEXT,
  p_notes TEXT,
  p_items JSONB
) RETURNS TEXT AS $$
DECLARE
  v_table_id UUID;
  v_order_id UUID;
  v_order_code TEXT;
  v_item RECORD;
  v_menu RECORD;
  v_total_amount DECIMAL := 0;
BEGIN
  -- 1. Validasi Meja
  SELECT id INTO v_table_id FROM tables WHERE token = p_table_token AND is_active = true;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Meja tidak ditemukan atau tidak aktif'; 
  END IF;

  -- 2. Generate Kode Order unik (Format: SC-YYMMDD-XXXX)
  v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));

  -- 3. Insert ke tabel orders
  INSERT INTO orders (order_code, table_id, customer_name, notes, order_status, payment_status)
  VALUES (v_order_code, v_table_id, p_customer_name, p_notes, 'pending', 'pending')
  RETURNING id INTO v_order_id;

  -- 4. Loop item untuk insert ke order_items & hitung total
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    menu_id UUID, 
    qty INT, 
    notes TEXT,
    price INT,
    base_price INT,
    modifiers JSONB
  )
  LOOP
    -- Cek ketersediaan dan ambil harga terkini
    SELECT * INTO v_menu FROM menus WHERE id = v_item.menu_id AND is_available = true;
    IF NOT FOUND THEN 
      RAISE EXCEPTION 'Menu tidak tersedia'; 
    END IF;
    
    -- Insert Item (pakai harga dari client yang sudah dihitung, atau recalc di server)
    INSERT INTO order_items (order_id, menu_id, menu_name, price, qty, notes, base_price, modifiers)
    VALUES (v_order_id, v_menu.id, v_menu.name, v_item.price, v_item.qty, v_item.notes, v_item.base_price, v_item.modifiers);
    
    -- Akumulasi total
    v_total_amount := v_total_amount + (v_item.price * v_item.qty);
  END LOOP;

  -- 5. Update total harga final
  UPDATE orders SET total_amount = v_total_amount WHERE id = v_order_id;
  
  RETURN v_order_code;
END;
$$ LANGUAGE plpgsql;