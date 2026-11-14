-- ============================================================
-- 011_pos_rpcs.sql
-- FASE 1: Core POS Business Logic RPCs (SECURITY DEFINER)
-- Sutha Corner Hybrid POS + QR Ordering Upgrade
-- ============================================================

-- ------------------------------------------------------------
-- Helper: hitung harga item (menu + modifier, atau bundle)
-- Return jsonb: {price, name, base_price, modifiers, menu_id, bundle_id}
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_item_price(
  p_menu_id uuid,
  p_option_ids uuid[],
  p_bundle_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_menu record;
  v_bundle record;
  v_price int := 0;
  v_name text;
  v_base int := 0;
  v_modifiers jsonb := '[]'::jsonb;
  v_group record;
  v_opt record;
  v_selected_count int;
  v_selected_option_ids uuid[];
BEGIN
  -- Kasus BUNDLE
  IF p_bundle_id IS NOT NULL THEN
    SELECT * INTO v_bundle FROM bundles WHERE id = p_bundle_id AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Paket tidak tersedia'; END IF;
    RETURN jsonb_build_object(
      'price', v_bundle.price,
      'name', v_bundle.name,
      'base_price', v_bundle.price,
      'modifiers', '[]'::jsonb,
      'menu_id', NULL,
      'bundle_id', v_bundle.id
    );
  END IF;

  -- Kasus MENU (dengan modifier)
  IF p_menu_id IS NULL THEN
    RAISE EXCEPTION 'Item tidak memiliki menu maupun bundle';
  END IF;

  SELECT * INTO v_menu FROM menus WHERE id = p_menu_id AND is_available = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Menu tidak tersedia'; END IF;

  v_price := v_menu.price;
  v_base := v_menu.price;
  v_name := v_menu.name;
  v_selected_option_ids := COALESCE(p_option_ids, '{}'::uuid[]);

  FOR v_group IN
    SELECT mg.* FROM modifier_groups mg
    JOIN menu_modifier_groups mmg ON mg.id = mmg.group_id
    WHERE mmg.menu_id = p_menu_id
  LOOP
    SELECT count(*) INTO v_selected_count
    FROM modifier_options
    WHERE id = ANY(v_selected_option_ids) AND group_id = v_group.id AND is_available = true;

    IF v_group.is_required AND v_selected_count < COALESCE(v_group.min_select, 1) THEN
      RAISE EXCEPTION 'Menu % wajib memilih %', v_menu.name, v_group.name;
    END IF;
    IF v_group.max_select IS NOT NULL AND v_selected_count > v_group.max_select THEN
      RAISE EXCEPTION 'Menu % melebihi batas pilihan %', v_menu.name, v_group.name;
    END IF;

    FOR v_opt IN SELECT * FROM modifier_options
      WHERE id = ANY(v_selected_option_ids) AND group_id = v_group.id
    LOOP
      v_price := v_price + v_opt.price_delta;
      v_modifiers := v_modifiers || jsonb_build_object(
        'group_name', v_group.name,
        'option_name', v_opt.name,
        'price_delta', v_opt.price_delta
      );
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'price', v_price,
    'name', v_name,
    'base_price', v_base,
    'modifiers', v_modifiers,
    'menu_id', v_menu.id,
    'bundle_id', NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION compute_item_price(uuid, uuid[], uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_item_price(uuid, uuid[], uuid) TO service_role;

-- ------------------------------------------------------------
-- Helper: verifikasi PIN admin aktif
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_admin_pin(
  p_admin_user_id uuid,
  p_pin text
) RETURNS boolean AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT auth_pin_hash INTO v_hash
  FROM user_profiles
  WHERE id = p_admin_user_id AND role = 'admin' AND is_active = true;

  IF v_hash IS NULL THEN RETURN false; END IF;
  RETURN v_hash = crypt(p_pin, v_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION verify_admin_pin(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_admin_pin(uuid, text) TO service_role;

-- ------------------------------------------------------------
-- Helper: set / ubah PIN admin (hash dilakukan server-side via pgcrypto)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_admin_pin(
  p_user_id uuid,
  p_pin text
) RETURNS void AS $$
BEGIN
  IF p_pin IS NULL OR length(p_pin) <> 6 OR p_pin !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'PIN harus 6 digit angka';
  END IF;

  UPDATE user_profiles
  SET auth_pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_user_id AND role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp;

REVOKE ALL ON FUNCTION set_admin_pin(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_admin_pin(uuid, text) TO service_role;

-- ------------------------------------------------------------
-- Helper: ambil shift aktif user (dipakai validasi kasir)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_active_shift(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_shift_id uuid;
BEGIN
  SELECT id INTO v_shift_id FROM shifts
  WHERE user_id = p_user_id AND status = 'open'
  ORDER BY opened_at DESC LIMIT 1;
  RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION get_active_shift(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_active_shift(uuid) TO service_role;

-- ============================================================
-- create_pos_order
-- Order dari Kasir POS: menu + modifier + bundle, payment_mode
-- bayar_sekarang / open_bill, direct cash/non-cash settlement,
-- auto short_number harian (#001, #002, ...)
-- ============================================================
CREATE OR REPLACE FUNCTION create_pos_order(
  p_created_by uuid,
  p_table_id uuid,
  p_customer_name text,
  p_notes text,
  p_items jsonb,
  p_payment_mode text DEFAULT 'bayar_sekarang',
  p_serving_method text DEFAULT 'ambil_sendiri',
  p_settle_now boolean DEFAULT false,
  p_method text DEFAULT NULL,
  p_cash_received numeric DEFAULT NULL,
  p_discount_amount numeric DEFAULT 0,
  p_discount_reason text DEFAULT NULL,
  p_discount_approved_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_order_id uuid;
  v_order_code text;
  v_short int;
  v_item record;
  v_calc jsonb;
  v_price int;
  v_base int;
  v_total int := 0;
  v_item_total int;
  v_change numeric := 0;
  v_shift_id uuid;
  v_method text;
  v_found boolean := true;
  v_settle_payment_id uuid;
BEGIN
  -- Validasi shift aktif jika settle langsung (non-online)
  IF p_settle_now AND p_method IS NOT NULL AND p_method <> 'xendit_online' THEN
    v_shift_id := get_active_shift(p_created_by);
    IF v_shift_id IS NULL THEN
      RAISE EXCEPTION 'Kasir tidak memiliki shift aktif. Buka shift terlebih dahulu.';
    END IF;
  END IF;

  -- Generate short_number harian dengan advisory lock (anti race)
  PERFORM pg_advisory_xact_lock(hashtext('sutha_short_' || to_char(now(), 'YYYYMMDD')));
  SELECT COALESCE(MAX(short_number), 0) + 1 INTO v_short
  FROM orders WHERE created_at::date = now()::date;

  -- Generate order_code unik
  WHILE v_found LOOP
    v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = v_order_code) INTO v_found;
  END LOOP;

  -- Insert order header
  INSERT INTO orders (
    order_code, access_token, table_id, customer_name, notes,
    total, order_status, payment_status,
    short_number, order_source, serving_method, payment_mode, open_bill_status,
    discount_amount, discount_reason, discount_approved_by,
    created_by, accepted_at
  ) VALUES (
    v_order_code,
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    p_table_id, p_customer_name, p_notes,
    0,
    CASE WHEN p_payment_mode = 'open_bill' THEN 'accepted' ELSE 'pending' END,
    CASE WHEN p_payment_mode = 'open_bill' THEN 'pending' ELSE 'pending' END,
    v_short, 'pos_cashier', p_serving_method, p_payment_mode,
    CASE WHEN p_payment_mode = 'open_bill' THEN 'approved' ELSE 'none' END,
    COALESCE(p_discount_amount, 0), p_discount_reason, p_discount_approved_by,
    p_created_by,
    CASE WHEN p_payment_mode = 'open_bill' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_order_id;

  -- Loop items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    menu_id uuid, bundle_id uuid, qty int, notes text, option_ids uuid[]
  )
  LOOP
    v_calc := compute_item_price(v_item.menu_id, v_item.option_ids, v_item.bundle_id);
    v_price := (v_calc->>'price')::int;
    v_base := (v_calc->>'base_price')::int;

    INSERT INTO order_items (order_id, menu_id, bundle_id, menu_name, base_price, price, qty, notes, modifiers)
    VALUES (
      v_order_id,
      v_calc->>'menu_id',
      v_calc->>'bundle_id',
      v_calc->>'name',
      v_base,
      v_price,
      v_item.qty,
      v_item.notes,
      v_calc->'modifiers'
    );

    v_item_total := v_price * v_item.qty;
    v_total := v_total + v_item_total;
  END LOOP;

  -- Terapkan diskon
  v_total := GREATEST(v_total - COALESCE(p_discount_amount, 0), 0);

  UPDATE orders SET total = v_total WHERE id = v_order_id;

  -- Direct settlement (kasir menerima pembayaran saat buat order)
  IF p_settle_now THEN
    v_method := COALESCE(p_method, 'cash');
    IF v_method = 'cash' AND p_cash_received IS NOT NULL THEN
      v_change := p_cash_received - v_total;
      IF v_change < 0 THEN
        RAISE EXCEPTION 'Uang diterima kurang dari total';
      END IF;
    END IF;

    INSERT INTO payments (order_id, transaction_id, amount, status, method, shift_id, confirmed_by, cash_received, change_amount, paid_at)
    VALUES (
      v_order_id,
      'POS-' || v_order_code || '-' || to_char(now(), 'HHMMSS'),
      v_total, 'paid', v_method, v_shift_id, p_created_by,
      CASE WHEN v_method = 'cash' THEN p_cash_received ELSE NULL END,
      CASE WHEN v_method = 'cash' THEN v_change ELSE NULL END,
      now()
    ) RETURNING id INTO v_settle_payment_id;

    UPDATE orders SET payment_status = 'paid', order_status = 'accepted', accepted_at = now()
    WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'short_number', v_short,
    'total', v_total,
    'change_amount', v_change,
    'open_bill_status', CASE WHEN p_payment_mode = 'open_bill' THEN 'approved' ELSE 'none' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION create_pos_order(uuid, uuid, text, text, jsonb, text, text, boolean, text, numeric, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_pos_order(uuid, uuid, text, text, jsonb, text, text, boolean, text, numeric, numeric, text, uuid) TO service_role;

-- ============================================================
-- approve_open_bill
-- Kasir mengonfirmasi pengajuan open_bill dari QR meja
-- ============================================================
CREATE OR REPLACE FUNCTION approve_open_bill(
  p_order_id uuid,
  p_approved_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;

  IF v_order.payment_mode <> 'open_bill' THEN
    RAISE EXCEPTION 'Bukan order open bill';
  END IF;
  IF v_order.open_bill_status <> 'pending_approval' THEN
    RAISE EXCEPTION 'Open bill sudah diproses';
  END IF;

  UPDATE orders
  SET open_bill_status = 'approved',
      order_status = 'accepted',
      accepted_at = now()
  WHERE id = p_order_id;

  PERFORM log_activity(p_approved_by, 'approve_open_bill', 'order', v_order.id::text, jsonb_build_object('order_code', v_order.order_code));

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION approve_open_bill(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION approve_open_bill(uuid, uuid) TO service_role;

-- ============================================================
-- append_open_bill_items
-- Pelanggan (via access_token) atau kasir menambah item ke
-- open_bill yang sudah approved & belum lunas
-- ============================================================
CREATE OR REPLACE FUNCTION append_open_bill_items(
  p_order_token text DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_order record;
  v_item record;
  v_calc jsonb;
  v_price int;
  v_base int;
  v_new_total int;
BEGIN
  -- Resolusi order: via token (customer) atau id (kasir)
  IF p_order_token IS NOT NULL THEN
    SELECT * INTO v_order FROM orders WHERE access_token = p_order_token FOR UPDATE;
  ELSE
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  END IF;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;

  IF v_order.payment_mode <> 'open_bill' THEN
    RAISE EXCEPTION 'Bukan order open bill';
  END IF;
  IF v_order.open_bill_status <> 'approved' THEN
    RAISE EXCEPTION 'Open bill belum disetujui';
  END IF;
  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Open bill sudah lunas';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    menu_id uuid, bundle_id uuid, qty int, notes text, option_ids uuid[]
  )
  LOOP
    v_calc := compute_item_price(v_item.menu_id, v_item.option_ids, v_item.bundle_id);
    v_price := (v_calc->>'price')::int;
    v_base := (v_calc->>'base_price')::int;

    INSERT INTO order_items (order_id, menu_id, bundle_id, menu_name, base_price, price, qty, notes, modifiers)
    VALUES (
      v_order.id, v_calc->>'menu_id', v_calc->>'bundle_id', v_calc->>'name',
      v_base, v_price, v_item.qty, v_item.notes, v_calc->'modifiers'
    );
  END LOOP;

  -- Hitung ulang total (item baru langsung jalan ke dapur/bar)
  SELECT COALESCE(SUM(price * qty), 0) INTO v_new_total
  FROM order_items WHERE order_id = v_order.id;

  v_new_total := GREATEST(v_new_total - COALESCE(v_order.discount_amount, 0), 0);

  UPDATE orders
  SET total = v_new_total, order_status = 'accepted', accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_order.id;

  IF p_created_by IS NOT NULL THEN
    PERFORM log_activity(p_created_by, 'append_open_bill_items', 'order', v_order.id::text, jsonb_build_object('order_code', v_order.order_code, 'total', v_new_total));
  END IF;

  RETURN jsonb_build_object('order_id', v_order.id, 'total', v_new_total, 'status', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION append_open_bill_items(text, uuid, jsonb, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION append_open_bill_items(text, uuid, jsonb, uuid) TO service_role;

-- ============================================================
-- apply_discount_with_pin
-- Diskon > 0 memerlukan verifikasi PIN admin aktif + reason
-- ============================================================
CREATE OR REPLACE FUNCTION apply_discount_with_pin(
  p_order_id uuid,
  p_discount_amount numeric,
  p_reason text,
  p_admin_user_id uuid,
  p_pin text
) RETURNS jsonb AS $$
DECLARE
  v_total int;
  v_new_total int;
BEGIN
  IF p_discount_amount <= 0 THEN
    RAISE EXCEPTION 'Diskon harus lebih dari 0';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Alasan diskon wajib diisi';
  END IF;
  IF NOT verify_admin_pin(p_admin_user_id, p_pin) THEN
    RAISE EXCEPTION 'PIN admin salah';
  END IF;

  SELECT total INTO v_total FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;

  v_new_total := GREATEST(v_total - p_discount_amount, 0);

  UPDATE orders
  SET discount_amount = p_discount_amount,
      discount_reason = p_reason,
      discount_approved_by = p_admin_user_id,
      total = v_new_total
  WHERE id = p_order_id;

  PERFORM log_activity(p_admin_user_id, 'apply_discount', 'order', p_order_id::text,
    jsonb_build_object('discount', p_discount_amount, 'reason', p_reason, 'new_total', v_new_total));

  RETURN jsonb_build_object('order_id', p_order_id, 'discount', p_discount_amount, 'total', v_new_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION apply_discount_with_pin(uuid, numeric, text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_discount_with_pin(uuid, numeric, text, uuid, text) TO service_role;

-- ============================================================
-- process_void_with_pin
-- Void order memerlukan verifikasi PIN admin aktif. Order
-- dibatalkan, dicatat ke void_logs & activity_logs.
-- ============================================================
CREATE OR REPLACE FUNCTION process_void_with_pin(
  p_order_id uuid,
  p_reason text,
  p_admin_user_id uuid,
  p_pin text,
  p_requested_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_order record;
  v_void_id uuid;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Alasan void wajib diisi';
  END IF;
  IF NOT verify_admin_pin(p_admin_user_id, p_pin) THEN
    RAISE EXCEPTION 'PIN admin salah';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'Order sudah dibatalkan';
  END IF;

  -- Update order jadi cancelled (dikecualikan dari total penjualan)
  UPDATE orders SET order_status = 'cancelled', completed_at = now() WHERE id = p_order_id;

  INSERT INTO void_logs (order_id, requested_by, approved_by, reason, status)
  VALUES (p_order_id, COALESCE(p_requested_by, p_admin_user_id), p_admin_user_id, p_reason, 'approved')
  RETURNING id INTO v_void_id;

  PERFORM log_activity(p_admin_user_id, 'void_order', 'order', p_order_id::text,
    jsonb_build_object('reason', p_reason, 'order_code', v_order.order_code, 'void_log_id', v_void_id));

  RETURN jsonb_build_object('order_id', p_order_id, 'void_id', v_void_id, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION process_void_with_pin(uuid, text, uuid, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_void_with_pin(uuid, text, uuid, text, uuid) TO service_role;

-- ============================================================
-- move_order_table
-- Pindahkan order (belum lunas) ke meja lain; update status meja
-- ============================================================
CREATE OR REPLACE FUNCTION move_order_table(
  p_order_id uuid,
  p_new_table_id uuid,
  p_created_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_order record;
  v_old_table uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order sudah lunas, tidak bisa dipindah';
  END IF;

  v_old_table := v_order.table_id;

  UPDATE orders SET table_id = p_new_table_id WHERE id = p_order_id;

  -- Meja baru terisi
  UPDATE tables SET status = 'terisi' WHERE id = p_new_table_id;

  -- Meja lama kosong jika tidak ada order aktif lain
  IF v_old_table IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM orders WHERE table_id = v_old_table
      AND payment_status <> 'paid' AND order_status NOT IN ('cancelled', 'completed')
  ) THEN
    UPDATE tables SET status = 'kosong' WHERE id = v_old_table;
  END IF;

  PERFORM log_activity(p_created_by, 'move_order_table', 'order', p_order_id::text,
    jsonb_build_object('from_table', v_old_table, 'to_table', p_new_table_id));

  RETURN jsonb_build_object('order_id', p_order_id, 'from_table', v_old_table, 'to_table', p_new_table_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION move_order_table(uuid, uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION move_order_table(uuid, uuid, uuid) TO service_role;

-- ============================================================
-- split_order_bill
-- Pindahkan item terpilih ke order baru (parent_order_id),
-- hitung ulang total kedua order
-- ============================================================
CREATE OR REPLACE FUNCTION split_order_bill(
  p_source_order_id uuid,
  p_item_ids uuid[],
  p_created_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_source record;
  v_new_order_id uuid;
  v_order_code text;
  v_short int;
  v_found boolean := true;
  v_source_total int;
  v_new_total int;
  v_item record;
BEGIN
  SELECT * INTO v_source FROM orders WHERE id = p_source_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order sumber tidak ditemukan'; END IF;
  IF v_source.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order sudah lunas, tidak bisa di-split';
  END IF;
  IF p_item_ids IS NULL OR array_length(p_item_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Pilih item yang akan di-split';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('sutha_short_' || to_char(now(), 'YYYYMMDD')));
  SELECT COALESCE(MAX(short_number), 0) + 1 INTO v_short
  FROM orders WHERE created_at::date = now()::date;

  WHILE v_found LOOP
    v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = v_order_code) INTO v_found;
  END LOOP;

  -- Order baru (split) dengan parent_order_id
  INSERT INTO orders (
    order_code, access_token, table_id, customer_name, notes, total,
    order_status, payment_status, short_number, order_source, serving_method,
    payment_mode, open_bill_status, parent_order_id, created_by
  ) VALUES (
    v_order_code,
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    v_source.table_id, v_source.customer_name, v_source.notes, 0,
    v_source.order_status, v_source.payment_status, v_short,
    v_source.order_source, v_source.serving_method,
    v_source.payment_mode, v_source.open_bill_status,
    v_source.id, p_created_by
  )
  RETURNING id INTO v_new_order_id;

  -- Pindahkan item terpilih
  UPDATE order_items
  SET order_id = v_new_order_id
  WHERE id = ANY(p_item_ids) AND order_id = v_source_order_id;

  -- Hitung ulang total kedua order
  SELECT COALESCE(SUM(price * qty), 0) INTO v_source_total
  FROM order_items WHERE order_id = v_source_order_id;
  SELECT COALESCE(SUM(price * qty), 0) INTO v_new_total
  FROM order_items WHERE order_id = v_new_order_id;

  UPDATE orders SET total = GREATEST(v_source_total - COALESCE(v_source.discount_amount, 0), 0) WHERE id = v_source_order_id;
  UPDATE orders SET total = v_new_total WHERE id = v_new_order_id;

  PERFORM log_activity(p_created_by, 'split_order_bill', 'order', v_source_order_id::text,
    jsonb_build_object('new_order_id', v_new_order_id, 'item_count', array_length(p_item_ids, 1)));

  RETURN jsonb_build_object('source_order_id', v_source_order_id, 'new_order_id', v_new_order_id, 'new_total', v_new_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION split_order_bill(uuid, uuid[], uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION split_order_bill(uuid, uuid[], uuid) TO service_role;

-- ============================================================
-- merge_order_bills
-- Gabungkan item order sumber (belum lunas) ke order target;
-- order sumber ditandai cancelled (merged)
-- ============================================================
CREATE OR REPLACE FUNCTION merge_order_bills(
  p_source_order_id uuid,
  p_target_order_id uuid,
  p_created_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_source record;
  v_target record;
  v_target_total int;
BEGIN
  SELECT * INTO v_source FROM orders WHERE id = p_source_order_id FOR UPDATE;
  SELECT * INTO v_target FROM orders WHERE id = p_target_order_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Order sumber tidak ditemukan'; END IF;
  IF v_target IS NULL THEN RAISE EXCEPTION 'Order target tidak ditemukan'; END IF;

  IF v_source.payment_status = 'paid' OR v_target.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Order lunas tidak bisa di-merge';
  END IF;
  IF v_source.id = v_target.id THEN
    RAISE EXCEPTION 'Order sama, tidak bisa di-merge';
  END IF;

  -- Pindahkan semua item sumber ke target
  UPDATE order_items SET order_id = p_target_order_id WHERE order_id = p_source_order_id;

  -- Hitung ulang total target
  SELECT COALESCE(SUM(price * qty), 0) INTO v_target_total
  FROM order_items WHERE order_id = p_target_order_id;
  UPDATE orders SET total = GREATEST(v_target_total - COALESCE(v_target.discount_amount, 0), 0) WHERE id = p_target_order_id;

  -- Tandai sumber cancelled (merged)
  UPDATE orders SET order_status = 'cancelled', completed_at = now() WHERE id = p_source_order_id;

  PERFORM log_activity(p_created_by, 'merge_order_bills', 'order', p_source_order_id::text,
    jsonb_build_object('target_order_id', p_target_order_id));

  RETURN jsonb_build_object('source_order_id', p_source_order_id, 'target_order_id', p_target_order_id, 'target_total', v_target_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION merge_order_bills(uuid, uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION merge_order_bills(uuid, uuid, uuid) TO service_role;
