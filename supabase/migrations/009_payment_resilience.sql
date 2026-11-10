-- 1. Tambah index unik dan kolom
ALTER TABLE payments ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_pending_per_order ON payments(order_id) WHERE status = 'pending';

-- 2. Fungsi atomik untuk sinkronisasi pembayaran
CREATE OR REPLACE FUNCTION apply_payment_status(
  p_invoice_id TEXT, 
  p_status TEXT, 
  p_amount INT, 
  p_method TEXT, 
  p_paid_at TIMESTAMPTZ, 
  p_payload JSONB
) RETURNS TEXT AS $$
DECLARE
  v_order_id UUID;
  v_order_total INT;
  v_calc_total INT;
  v_payment_id UUID;
  v_current_status TEXT;
BEGIN
  -- Kunci payment dan order
  SELECT order_id, status INTO v_payment_id, v_current_status FROM payments WHERE transaction_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  
  -- Jika sudah dibayar, abaikan
  IF v_current_status = 'paid' THEN RETURN 'noop'; END IF;

  SELECT id, total INTO v_order_id, v_order_total FROM orders WHERE id = (SELECT order_id FROM payments WHERE transaction_id = p_invoice_id) FOR UPDATE;

  -- Validasi Nominal
  SELECT SUM(price * qty) INTO v_calc_total FROM order_items WHERE order_id = v_order_id;
  
  IF p_amount != v_order_total OR v_order_total != v_calc_total THEN
    UPDATE payments SET status = 'amount_mismatch', raw_payload = p_payload WHERE transaction_id = p_invoice_id;
    RETURN 'amount_mismatch';
  END IF;

  -- Update Payment & Order
  UPDATE payments SET status = p_status, amount = p_amount, raw_payload = p_payload, paid_at = p_paid_at WHERE transaction_id = p_invoice_id;
  UPDATE orders SET payment_status = p_status WHERE id = v_order_id;

  RETURN 'updated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION apply_payment_status(text, text, int, text, timestamptz, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION apply_payment_status(text, text, int, text, timestamptz, jsonb) TO service_role;
