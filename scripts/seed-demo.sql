-- ============================================================
-- seed-demo.sql — DATA DUMMY UNTUK PEMANTAPAN DASHBOARD
-- ============================================================
-- CATATAN PENTING
--  * Semua baris ditandai is_demo = true sehingga mudah dihapus.
--  * Skrip ini TIDAK membuat menu/kategori/meja baru. Ia memakai
--    menu & meja yang SUDAH ADA di database Anda, jadi katalog
--    tidak tercemar data dummy.
--  * JANGAN jalankan di produksi. Gunakan pada database uji/demo.
--  * Butuh minimal 1 user dengan role 'admin' dan is_active = true.
--  * Butuh minimal 1 menu dengan is_active & is_available = true.
--
-- Jalankan: Supabase SQL Editor, atau
--   psql "$DATABASE_URL" -f scripts/seed-demo.sql
--
-- HAPUS SEMUA DATA DUMMY:
--   DO $$
--   DECLARE v uuid[];
--   BEGIN
--     SELECT array_agg(id) INTO v FROM orders WHERE is_demo;
--     IF v IS NOT NULL THEN
--       DELETE FROM void_logs   WHERE order_id = ANY(v);
--       DELETE FROM payments    WHERE order_id = ANY(v);
--       DELETE FROM order_items WHERE order_id = ANY(v);
--       DELETE FROM orders      WHERE id = ANY(v);
--     END IF;
--     DELETE FROM expenses     WHERE is_demo;
--     DELETE FROM reservations WHERE is_demo;
--     DELETE FROM shifts
--       WHERE status = 'closed' AND reviewed_at IS NULL
--         AND cash_difference = -17000
--         AND opened_at BETWEEN now() - interval '7 day' AND now() - interval '5 day';
--   END $$;
-- ============================================================

DO $$
DECLARE
  v_owner      uuid;
  v_menus      uuid[];
  v_shift      uuid;
  v_order      uuid;
  v_code       text;
  v_short      int;
  v_d          int;
  v_i          int;
  v_total      int;
  v_method     text;
  v_status     text;
  v_src        text;
  v_serve      text;
  v_ts         timestamptz;
BEGIN
  -- ---------- prasyarat ----------
  SELECT id INTO v_owner
  FROM user_profiles
  WHERE role = 'admin' AND is_active
  ORDER BY created_at
  LIMIT 1;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Tidak ada user admin aktif. Buat admin dulu.';
  END IF;

  SELECT array_agg(id) INTO v_menus
  FROM menus
  WHERE coalesce(is_active, true) AND coalesce(is_available, true);

  IF v_menus IS NULL THEN
    RAISE EXCEPTION 'Tidak ada menu aktif & tersedia. Tambah menu dulu.';
  END IF;

  -- ---------- bersihkan sisa dummy sebelumnya (idempoten) ----------
  DECLARE v_old uuid[];
  BEGIN
    SELECT array_agg(id) INTO v_old FROM orders WHERE is_demo;
    IF v_old IS NOT NULL THEN
      DELETE FROM void_logs   WHERE order_id = ANY(v_old);
      DELETE FROM payments    WHERE order_id = ANY(v_old);
      DELETE FROM order_items WHERE order_id = ANY(v_old);
      DELETE FROM orders      WHERE id = ANY(v_old);
    END IF;
    DELETE FROM expenses WHERE is_demo;
    DELETE FROM reservations WHERE is_demo;
    -- shift dummy: ditutup ~6 hari lalu, belum ditinjau, selisih -17000
    DELETE FROM shifts
    WHERE status = 'closed'
      AND reviewed_at IS NULL
      AND cash_difference = -17000
      AND opened_at BETWEEN now() - interval '7 day' AND now() - interval '5 day';
  END;

  -- ---------- 1 shift ditutup dengan selisih kas (-17.000), belum ditinjau ----------
  INSERT INTO shifts (
    user_id, opened_at, opening_cash, closed_at,
    total_cash, total_non_cash, counted_cash, cash_difference, status
  ) VALUES (
    v_owner, now() - interval '6 day', 250000,
    now() - interval '6 day' + interval '9 hour',
    380000, 265000, 628000, -17000, 'closed'
  )
  RETURNING id INTO v_shift;

  -- ---------- 42 order tersebar 7 hari (6 per hari) ----------
  -- Per hari: 2 Tunai lunas, 2 QRIS lunas, 2 pending (pos_cashier, open bill)
  FOR v_d IN 0..6 LOOP
    FOR v_i IN 1..6 LOOP
      v_ts    := now() - (v_d || ' day')::interval - ((12 + v_i * 2) || ' hour')::interval;
      v_short := 500 + v_d * 10 + v_i;
      v_code  := 'DUMMY-' || to_char(v_ts, 'YYMMDD') || '-' || lpad(v_i::text, 2, '0');

      IF v_i <= 2 THEN
        v_method := 'cash';        v_status := 'paid';
      ELSIF v_i <= 4 THEN
        v_method := 'qris_xendit'; v_status := 'paid';
      ELSE
        v_method := 'cash';        v_status := 'pending';
      END IF;

      v_src   := CASE WHEN v_i <= 4 THEN 'qr_table' ELSE 'pos_cashier' END;
      v_serve := CASE WHEN v_i % 2 = 0 THEN 'antar_meja' ELSE 'ambil_sendiri' END;

      INSERT INTO orders (
        order_code, access_token, short_number, order_source, serving_method,
        payment_mode, open_bill_status, payment_status, order_status, total,
        tax_amount, customer_name, created_at, accepted_at, completed_at,
        created_by, is_demo
      ) VALUES (
        v_code,
        replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
        v_short, v_src, v_serve,
        CASE WHEN v_i = 5 THEN 'open_bill' ELSE 'bayar_sekarang' END,
        'none', v_status,
        CASE WHEN v_status = 'paid' THEN 'completed' ELSE 'pending' END,
        0, 0, 'Pelanggan Dummy ' || v_i,
        v_ts,
        CASE WHEN v_status = 'paid' THEN v_ts END,
        CASE WHEN v_status = 'paid' THEN v_ts + interval '25 minute' END,
        v_owner, true
      )
      RETURNING id INTO v_order;

      INSERT INTO order_items (order_id, menu_id, menu_name, base_price, price, qty, modifiers)
      SELECT v_order, m.id, m.name, m.price, m.price,
             (1 + floor(random() * 3)::int), '[]'::jsonb
      FROM menus m
      WHERE m.id = ANY(v_menus)
      ORDER BY random()
      LIMIT (1 + floor(random() * 3)::int);

      -- total order = jumlah item yang benar-benar masuk
      SELECT COALESCE(SUM(price * qty), 0) INTO v_total
      FROM order_items WHERE order_id = v_order;
      IF v_total = 0 THEN v_total := 35000; END IF;
      UPDATE orders SET total = v_total WHERE id = v_order;

      IF v_status = 'paid' THEN
        INSERT INTO payments (
          order_id, transaction_id, amount, status, method,
          shift_id, confirmed_by, paid_at
        ) VALUES (
          v_order, 'DUMMY-PAY-' || v_code, v_total, 'paid', v_method,
          v_shift, v_owner, v_ts
        );
      END IF;
    END LOOP;
  END LOOP;

  -- ---------- 3 open bill menunggu persetujuan kasir ----------
  FOR v_i IN 1..3 LOOP
    v_ts   := now() - interval '20 minute';
    v_code := 'DUMMY-OB-' || lpad(v_i::text, 2, '0');

    INSERT INTO orders (
      order_code, access_token, short_number, order_source, serving_method,
      payment_mode, open_bill_status, payment_status, order_status, total,
      customer_name, created_at, is_demo
    ) VALUES (
      v_code,
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      700 + v_i, 'qr_table', 'antar_meja',
      'open_bill', 'pending_approval', 'pending', 'pending',
      0, 'Pelanggan Open Bill ' || v_i, v_ts, true
    )
    RETURNING id INTO v_order;

    INSERT INTO order_items (order_id, menu_id, menu_name, base_price, price, qty, modifiers)
    SELECT v_order, m.id, m.name, m.price, m.price, 2, '[]'::jsonb
    FROM menus m WHERE m.id = ANY(v_menus)
    ORDER BY random() LIMIT 2;

    SELECT COALESCE(SUM(price * qty), 0) INTO v_total
    FROM order_items WHERE order_id = v_order;
    UPDATE orders SET total = v_total WHERE id = v_order;
  END LOOP;

  -- ---------- 1 pembayaran refund_pending (QRIS masuk setelah kedaluwarsa) ----------
  INSERT INTO payments (
    order_id, transaction_id, amount, status, method,
    shift_id, confirmed_by, paid_at
  )
  SELECT id, 'DUMMY-REFUND-' || order_code, total, 'refund_pending',
         'qris_xendit', v_shift, v_owner, now()
  FROM orders
  WHERE is_demo AND payment_status = 'paid'
  ORDER BY created_at
  LIMIT 1;

  -- ---------- 7 pengeluaran ----------
  FOR v_d IN 0..6 LOOP
    INSERT INTO expenses (expense_date, category, amount, description, recorded_by, is_demo)
    VALUES (
      (now() - (v_d || ' day')::interval)::date,
      CASE WHEN v_d % 2 = 0 THEN 'Bahan Baku' ELSE 'Operasional' END,
      85000 + v_d * 12000,
      'Dummy pengeluaran hari ke-' || v_d,
      v_owner, true
    );
  END LOOP;

  -- ---------- 2 void log (approved) ----------
  INSERT INTO void_logs (order_id, requested_by, approved_by, reason, status)
  SELECT id, v_owner, v_owner, 'Dummy: pelanggan membatalkan pesanan', 'approved'
  FROM orders
  WHERE is_demo AND payment_status = 'paid'
  ORDER BY created_at DESC
  LIMIT 2;

  RAISE NOTICE 'Seed dummy selesai: 45 order (28 lunas), 3 open bill, 1 refund pending, 7 pengeluaran, 1 shift selisih.';
END $$;