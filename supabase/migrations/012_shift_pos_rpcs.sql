-- ============================================================
-- 012_shift_pos_rpcs.sql
-- FASE 2: Shift Management + Generic Order Settlement RPCs
-- Sutha Corner Hybrid POS Upgrade
-- ============================================================

-- ------------------------------------------------------------
-- open_shift: kasir membuka shift dengan modal awal tunai
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION open_shift(
  p_user_id uuid,
  p_opening_cash numeric
) RETURNS jsonb AS $$
DECLARE
  v_shift_id uuid;
  v_existing uuid;
BEGIN
  IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
    RAISE EXCEPTION 'Modal awal tidak boleh negatif';
  END IF;

  -- Cegah shift ganda untuk user yang sama
  SELECT id INTO v_existing FROM shifts WHERE user_id = p_user_id AND status = 'open';
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Anda masih memiliki shift aktif';
  END IF;

  INSERT INTO shifts (user_id, opening_cash, status)
  VALUES (p_user_id, p_opening_cash, 'open')
  RETURNING id INTO v_shift_id;

  PERFORM log_activity(p_user_id, 'open_shift', 'shift', v_shift_id::text,
    jsonb_build_object('opening_cash', p_opening_cash));

  RETURN jsonb_build_object('shift_id', v_shift_id, 'status', 'open', 'opening_cash', p_opening_cash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION open_shift(uuid, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION open_shift(uuid, numeric) TO service_role;

-- ------------------------------------------------------------
-- close_shift: tutup shift, hitung expected_cash & cash_difference
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_shift(
  p_shift_id uuid,
  p_counted_cash numeric
) RETURNS jsonb AS $$
DECLARE
  v_shift record;
  v_expected numeric;
  v_cash numeric;
  v_non_cash numeric;
  v_void_count int;
  v_discount_sum numeric;
BEGIN
  SELECT * INTO v_shift FROM shifts WHERE id = p_shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Shift tidak ditemukan'; END IF;
  IF v_shift.status <> 'open' THEN RAISE EXCEPTION 'Shift sudah ditutup'; END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN
    RAISE EXCEPTION 'Hitungan kas tidak valid';
  END IF;

  -- Total tunai & non-tunai dari payment dalam shift ini
  SELECT COALESCE(SUM(amount), 0) INTO v_cash
  FROM payments WHERE shift_id = p_shift_id AND status = 'paid' AND method = 'cash';

  SELECT COALESCE(SUM(amount), 0) INTO v_non_cash
  FROM payments WHERE shift_id = p_shift_id AND status = 'paid' AND method <> 'cash';

  v_expected := v_shift.opening_cash + v_cash;

  UPDATE shifts SET
    closed_at = now(),
    status = 'closed',
    total_cash = v_cash,
    total_non_cash = v_non_cash,
    counted_cash = p_counted_cash,
    cash_difference = p_counted_cash - v_expected
  WHERE id = p_shift_id;

  -- Statistik void & diskon pada jendela shift
  SELECT COUNT(*) INTO v_void_count
  FROM orders
  WHERE created_by = v_shift.user_id
    AND order_status = 'cancelled'
    AND created_at BETWEEN v_shift.opened_at AND COALESCE(closed_at, now());

  SELECT COALESCE(SUM(discount_amount), 0) INTO v_discount_sum
  FROM orders
  WHERE created_by = v_shift.user_id
    AND created_at BETWEEN v_shift.opened_at AND COALESCE(closed_at, now());

  PERFORM log_activity(v_shift.user_id, 'close_shift', 'shift', p_shift_id::text,
    jsonb_build_object('expected_cash', v_expected, 'counted_cash', p_counted_cash, 'difference', p_counted_cash - v_expected));

  RETURN jsonb_build_object(
    'shift_id', p_shift_id,
    'expected_cash', v_expected,
    'total_cash', v_cash,
    'total_non_cash', v_non_cash,
    'counted_cash', p_counted_cash,
    'cash_difference', p_counted_cash - v_expected,
    'void_count', v_void_count,
    'discount_sum', v_discount_sum
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION close_shift(uuid, numeric) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION close_shift(uuid, numeric) TO service_role;

-- ------------------------------------------------------------
-- settle_order_payment: lunasi order (bayar_sekarang langsung,
-- tutup tagihan open bill). Validasi shift untuk tunai/non-tunai.
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

  -- Shift aktif wajib untuk pembayaran yang diterima kasir
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

  -- Order lunas: status selesai (open bill sudah di dapur; bayar_sekarang langsung accepted -> completed)
  UPDATE orders
  SET payment_status = 'paid', order_status = 'completed', completed_at = now()
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
