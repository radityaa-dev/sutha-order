-- ============================================================
-- 013_customer_qr_flow.sql
-- FASE 3: Customer QR Ordering Enhancements
--  - create_qr_order (serving_method + payment_mode + short_number)
--  - expire_stale_online_orders (auto-cancel unpaid > timeout)
--  - Fix settle_order_payment: jangan lompat ke completed (harus lewat dapur)
-- ============================================================

-- ------------------------------------------------------------
-- create_qr_order: versi customer QR dari create_order dengan
-- serving_method, payment_mode, dan short_number harian.
-- bayar_sekarang -> pending sampai Xendit paid -> accepted (dapur).
-- open_bill       -> pending_approval (tidak ke dapur sampai kasir approve).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_qr_order(
  p_table_token text,
  p_customer_name text,
  p_notes text,
  p_items jsonb,
  p_serving_method text DEFAULT 'ambil_sendiri',
  p_payment_mode text DEFAULT 'bayar_sekarang'
) RETURNS jsonb AS $$
DECLARE
  v_table_id uuid;
  v_order_id uuid;
  v_order_code text;
  v_access_token text;
  v_short int;
  v_item record;
  v_menu record;
  v_opt record;
  v_group record;
  v_total_amount int := 0;
  v_item_price int;
  v_item_modifiers jsonb := '[]';
  v_selected_count int;
  v_found boolean := true;
  v_selected_option_ids uuid[];
BEGIN
  IF p_payment_mode NOT IN ('bayar_sekarang', 'open_bill') THEN
    RAISE EXCEPTION 'Metode pembayaran tidak valid';
  END IF;

  SELECT id INTO v_table_id FROM tables WHERE token = p_table_token AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meja tidak ditemukan'; END IF;

  -- short_number harian (advisory lock anti race)
  PERFORM pg_advisory_xact_lock(hashtext('sutha_short_' || to_char(now(), 'YYYYMMDD')));
  SELECT COALESCE(MAX(short_number), 0) + 1 INTO v_short
  FROM orders WHERE created_at::date = now()::date;

  WHILE v_found LOOP
    v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = v_order_code) INTO v_found;
  END LOOP;

  v_access_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

  INSERT INTO orders (
    order_code, access_token, table_id, customer_name, notes,
    total, order_status, payment_status, short_number, order_source,
    serving_method, payment_mode, open_bill_status
  ) VALUES (
    v_order_code, v_access_token, v_table_id, p_customer_name, p_notes,
    0, 'pending', 'pending', v_short, 'qr_table',
    p_serving_method, p_payment_mode,
    CASE WHEN p_payment_mode = 'open_bill' THEN 'pending_approval' ELSE 'none' END
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    menu_id uuid, qty int, notes text, option_ids uuid[]
  )
  LOOP
    SELECT * INTO v_menu FROM menus WHERE id = v_item.menu_id AND is_available = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'Menu tidak tersedia'; END IF;

    v_item_price := v_menu.price;
    v_item_modifiers := '[]'::jsonb;
    v_selected_option_ids := COALESCE(v_item.option_ids, '{}'::uuid[]);

    FOR v_group IN
      SELECT mg.* FROM modifier_groups mg
      JOIN menu_modifier_groups mmg ON mg.id = mmg.group_id
      WHERE mmg.menu_id = v_item.menu_id
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

  RETURN jsonb_build_object(
    'order_code', v_order_code,
    'access_token', v_access_token,
    'short_number', v_short,
    'payment_mode', p_payment_mode,
    'open_bill_status', CASE WHEN p_payment_mode = 'open_bill' THEN 'pending_approval' ELSE 'none' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION create_qr_order(text, text, text, jsonb, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_qr_order(text, text, text, jsonb, text, text) TO service_role;

-- ------------------------------------------------------------
-- OVERRIDE apply_payment_status: saat QR order lunas via Xendit,
-- order harus masuk dapur (accepted + accepted_at), bukan tetap pending.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_payment_status(
  p_invoice_id text,
  p_status text,
  p_amount int,
  p_method text,
  p_paid_at timestamptz,
  p_payload jsonb
) RETURNS text AS $$
DECLARE
  v_order_id uuid;
  v_order_total int;
  v_calc_total int;
  v_payment_id uuid;
  v_current_status text;
BEGIN
  SELECT order_id, status INTO v_payment_id, v_current_status FROM payments WHERE transaction_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_current_status = 'paid' THEN RETURN 'noop'; END IF;

  SELECT id, total INTO v_order_id, v_order_total FROM orders WHERE id = (SELECT order_id FROM payments WHERE transaction_id = p_invoice_id) FOR UPDATE;

  SELECT SUM(price * qty) INTO v_calc_total FROM order_items WHERE order_id = v_order_id;

  IF p_amount != v_order_total OR v_order_total != v_calc_total THEN
    UPDATE payments SET status = 'amount_mismatch', raw_payload = p_payload WHERE transaction_id = p_invoice_id;
    RETURN 'amount_mismatch';
  END IF;

  UPDATE payments SET status = 'paid', amount = p_amount, raw_payload = p_payload, paid_at = p_paid_at WHERE transaction_id = p_invoice_id;
  UPDATE orders
  SET payment_status = 'paid',
      order_status = 'accepted',
      accepted_at = COALESCE(accepted_at, now())
  WHERE id = v_order_id;

  RETURN 'updated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION apply_payment_status(text, text, int, text, timestamptz, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_payment_status(text, text, int, text, timestamptz, jsonb) TO service_role;

-- ------------------------------------------------------------
-- expire_stale_online_orders: tandai expired order QR bayar_sekarang
-- yang belum dibayar melewati batas waktu (default 15 menit).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION expire_stale_online_orders()
RETURNS int AS $$
DECLARE
  v_timeout int;
  v_count int;
BEGIN
  SELECT COALESCE(online_payment_timeout_minutes, 15) INTO v_timeout
  FROM store_settings WHERE id = 1;

  UPDATE orders
  SET payment_status = 'expired', order_status = 'expired'
  WHERE order_source = 'qr_table'
    AND payment_mode = 'bayar_sekarang'
    AND payment_status = 'pending'
    AND created_at < now() - (v_timeout || ' minutes')::interval;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION expire_stale_online_orders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_stale_online_orders() TO service_role;

-- ------------------------------------------------------------
-- FIX: settle_order_payment tidak boleh langsung completed.
-- Order harus tetap mengalir lewat dapur (accepted -> preparing ->
-- ready -> completed). Hanya payment_status yang berubah.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION settle_order_payment(
  p_order_id uuid,
  p_method text,
  p_cash_received numeric,
  p_created_by uuid
) RETURNS jsonb AS $$
DECLARE
  v_order record;
  v_shift_id uuid;
  v_change numeric := 0;
  v_payment_id uuid;
BEGIN
  IF p_method NOT IN ('cash', 'qris_manual', 'transfer', 'edc_card') THEN
    RAISE EXCEPTION 'Metode pembayaran tidak valid';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.payment_status = 'paid' THEN RAISE EXCEPTION 'Order sudah lunas'; END IF;
  IF v_order.order_status = 'cancelled' THEN RAISE EXCEPTION 'Order dibatalkan, tidak bisa dilunasi'; END IF;

  v_shift_id := get_active_shift(p_created_by);
  IF v_shift_id IS NULL THEN
    RAISE EXCEPTION 'Kasir tidak memiliki shift aktif. Buka shift terlebih dahulu.';
  END IF;

  IF p_method = 'cash' AND p_cash_received IS NOT NULL THEN
    v_change := p_cash_received - v_order.total;
    IF v_change < 0 THEN RAISE EXCEPTION 'Uang diterima kurang dari total'; END IF;
  END IF;

  INSERT INTO payments (
    order_id, transaction_id, amount, status, method, shift_id,
    confirmed_by, cash_received, change_amount, paid_at
  ) VALUES (
    p_order_id,
    'POS-' || v_order.order_code || '-' || to_char(now(), 'HHMMSS'),
    v_order.total, 'paid', p_method, v_shift_id, p_created_by,
    CASE WHEN p_method = 'cash' THEN p_cash_received ELSE NULL END,
    CASE WHEN p_method = 'cash' THEN v_change ELSE NULL END,
    now()
  ) RETURNING id INTO v_payment_id;

  -- Hanya tandai lunas; status dapur tetap mengalir (accepted -> preparing -> ready -> completed)
  UPDATE orders
  SET payment_status = 'paid'
  WHERE id = p_order_id;

  PERFORM log_activity(p_created_by, 'settle_order', 'order', p_order_id::text,
    jsonb_build_object('method', p_method, 'total', v_order.total, 'change', v_change));

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'payment_id', v_payment_id,
    'total', v_order.total,
    'change', v_change,
    'method', p_method
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION settle_order_payment(uuid, text, numeric, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION settle_order_payment(uuid, text, numeric, uuid) TO service_role;
