-- ============================================================
-- 015_qris_xendit.sql
-- Migrasi: Dukungan QRIS via Xendit Payment Requests (v3)
--  - Perluas payments.method & status
--  - RPC idempotent untuk menyelesaikan pembayaran QRIS
--    (dipakai webhook dan polling)
--  - GRANT hanya untuk service_role
-- ============================================================

-- 1. Perluas constraint method & status pada payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('xendit_online', 'cash', 'qris_manual', 'transfer', 'edc_card', 'qris_xendit'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'amount_mismatch', 'refund_pending'));

-- 2. Index untuk pencarian payment QRIS aktif per order
CREATE INDEX IF NOT EXISTS idx_payments_order_status ON payments(order_id, status);

-- 3. RPC: settle_qr_payment
--    Idempotent. Dipanggil oleh webhook & polling dengan p_payment_id.
--    - Lock payment & order
--    - Validasi amount
--    - Tandai paid + order lunas
--    - Jika QR sudah expired atau order sudah lunas -> refund_pending + log
CREATE OR REPLACE FUNCTION settle_qr_payment(
  p_payment_id uuid,
  p_paid_amount int,
  p_transaction_id text DEFAULT NULL,
  p_method text DEFAULT 'qris_xendit'
) RETURNS jsonb AS $$
DECLARE
  v_payment record;
  v_order record;
  v_calc_total int;
  v_now timestamptz := now();
  v_expired boolean := false;
BEGIN
  IF p_method <> 'qris_xendit' THEN
    RAISE EXCEPTION 'Metode tidak valid untuk settle_qr_payment';
  END IF;

  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'not_found');
  END IF;

  -- Idempotent: sudah lunas
  IF v_payment.status = 'paid' THEN
    RETURN jsonb_build_object('result', 'noop', 'order_id', v_payment.order_id);
  END IF;

  -- Ambil order terkunci
  SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('result', 'order_not_found');
  END IF;

  -- Validasi nominal (bandingkan dengan total order)
  SELECT COALESCE(SUM(price * qty), 0) INTO v_calc_total FROM order_items WHERE order_id = v_order.id;
  IF p_paid_amount <> v_order.total OR v_order.total <> v_calc_total THEN
    UPDATE payments SET status = 'amount_mismatch', raw_payload = jsonb_build_object('paid_amount', p_paid_amount, 'expected', v_order.total, 'calc', v_calc_total)
    WHERE id = p_payment_id;
    PERFORM log_activity(v_payment.confirmed_by, 'qr_amount_mismatch', 'payment', p_payment_id::text, jsonb_build_object('order_id', v_order.id, 'paid', p_paid_amount, 'expected', v_order.total));
    RETURN jsonb_build_object('result', 'amount_mismatch');
  END IF;

  -- Cek kedaluwarsa: jika QR sudah expired atau order sudah lunas -> refund_pending
  IF v_order.payment_status = 'paid' THEN
    v_expired := true;
  ELSIF v_payment.raw_payload->>'expires_at' IS NOT NULL
     AND (v_payment.raw_payload->>'expires_at')::timestamptz < v_now THEN
    v_expired := true;
  END IF;

  IF v_expired THEN
    UPDATE payments SET status = 'refund_pending',
      amount = p_paid_amount,
      transaction_id = COALESCE(p_transaction_id, transaction_id),
      paid_at = v_now,
      raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object('refund_reason', 'expired_or_already_paid', 'settled_at', v_now)
    WHERE id = p_payment_id;
    PERFORM log_activity(v_payment.confirmed_by, 'qr_refund_pending', 'payment', p_payment_id::text,
      jsonb_build_object('order_id', v_order.id, 'amount', p_paid_amount, 'reason', 'expired_or_already_paid'));
    RETURN jsonb_build_object('result', 'refund_pending', 'payment_id', p_payment_id);
  END IF;

  -- Normal: tandai lunas
  UPDATE payments SET status = 'paid', amount = p_paid_amount,
    transaction_id = COALESCE(p_transaction_id, transaction_id), paid_at = v_now
  WHERE id = p_payment_id;

  -- Order lunas; jika masih 'pending', dorong ke dapur (accepted).
  UPDATE orders
  SET payment_status = 'paid',
      order_status = CASE WHEN order_status = 'pending' THEN 'accepted' ELSE order_status END,
      accepted_at = CASE WHEN order_status = 'pending' AND accepted_at IS NULL THEN v_now ELSE accepted_at END
  WHERE id = v_order.id;

  PERFORM log_activity(v_payment.confirmed_by, 'qr_paid', 'order', v_order.id::text,
    jsonb_build_object('payment_id', p_payment_id, 'amount', p_paid_amount, 'method', p_method));

  RETURN jsonb_build_object('result', 'paid', 'order_id', v_order.id, 'payment_id', p_payment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION settle_qr_payment(uuid, int, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION settle_qr_payment(uuid, int, text, text) TO service_role;

-- 4. RPC: expire_qr_payments
--    Tandai payment QRIS pending yang sudah lewat expires_at sebagai expired.
CREATE OR REPLACE FUNCTION expire_qr_payments()
RETURNS int AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE payments
  SET status = 'expired'
  WHERE method = 'qris_xendit'
    AND status = 'pending'
    AND raw_payload->>'expires_at' IS NOT NULL
    AND (raw_payload->>'expires_at')::timestamptz < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION expire_qr_payments() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION expire_qr_payments() TO service_role;