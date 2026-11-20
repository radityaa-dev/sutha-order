-- ============================================================
-- 017_add_tax_calculation.sql
-- Menambahkan logika perhitungan pajak (10%) pada order
-- ============================================================

-- Fungsi untuk menghitung pajak
CREATE OR REPLACE FUNCTION calculate_tax(amount INT)
RETURNS INT AS $$
BEGIN
    RETURN ROUND(amount * 0.10); -- 10% pajak
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update fungsi create_qr_order untuk menyertakan pajak
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
    v_tax_amount int := 0;
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
        v_selected_option_ids := COALESCE(v_item.option_ids, ARRAY[]::uuid[]);

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

    -- Hitung pajak 10%
    v_tax_amount := calculate_tax(v_total_amount);

    UPDATE orders SET total = v_total_amount + v_tax_amount, tax_amount = v_tax_amount WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'order_code', v_order_code,
        'access_token', v_access_token,
        'short_number', v_short,
        'payment_mode', p_payment_mode,
        'open_bill_status', CASE WHEN p_payment_mode = 'open_bill' THEN 'pending_approval' ELSE 'none' END,
        'total', v_total_amount + v_tax_amount,
        'tax_amount', v_tax_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION create_qr_order(text, text, text, jsonb, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_qr_order(text, text, text, jsonb, text, text) TO service_role;

-- Update fungsi create_pos_order untuk menyertakan pajak
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
    v_tax_amount int := 0;
    v_item_total int;
    v_change numeric := 0;
    v_shift_id uuid;
    v_method text;
    v_found boolean := true;
    v_settle_payment_id uuid;
BEGIN
    IF p_settle_now AND p_method IS NOT NULL AND p_method <> 'xendit_online' THEN
        v_shift_id := get_active_shift(p_created_by);
        IF v_shift_id IS NULL THEN
            RAISE EXCEPTION 'Kasir tidak memiliki shift aktif. Buka shift terlebih dahulu.';
        END IF;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('sutha_short_' || to_char(now(), 'YYYYMMDD')));
    SELECT COALESCE(MAX(short_number), 0) + 1 INTO v_short
    FROM orders WHERE created_at::date = now()::date;

    WHILE v_found LOOP
        v_order_code := 'SC-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 4));
        SELECT EXISTS(SELECT 1 FROM orders WHERE order_code = v_order_code) INTO v_found;
    END LOOP;

    INSERT INTO orders (
        order_code, access_token, table_id, customer_name, notes,
        total, order_status, payment_status, short_number, order_source,
        serving_method, payment_mode, open_bill_status,
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

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        menu_id uuid, bundle_id uuid, qty int, notes text, option_ids uuid[]
    )
    LOOP
        v_calc := compute_item_price(
            NULLIF(v_item.menu_id::text, '')::uuid,
            COALESCE(v_item.option_ids, ARRAY[]::uuid[]),
            NULLIF(v_item.bundle_id::text, '')::uuid
        );
        v_price := (v_calc->>'price')::int;
        v_base := (v_calc->>'base_price')::int;

        INSERT INTO order_items (order_id, menu_id, bundle_id, menu_name, base_price, price, qty, notes, modifiers)
        VALUES (
            v_order_id,
            NULLIF(v_calc->>'menu_id', '')::uuid,
            NULLIF(v_calc->>'bundle_id', '')::uuid,
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

    -- Hitung pajak 10%
    v_tax_amount := calculate_tax(v_total);

    UPDATE orders SET total = v_total + v_tax_amount, tax_amount = v_tax_amount WHERE id = v_order_id;

    IF p_settle_now THEN
        v_method := COALESCE(p_method, 'cash');
        if v_method = 'cash' then
            v_change := COALESCE(p_cash_received, 0) - (v_total + v_tax_amount);
        else
            v_change := 0;
        end if;

        INSERT INTO payments (order_id, transaction_id, amount, status, method, shift_id, confirmed_by, cash_received, change_amount, paid_at)
        VALUES (
            v_order_id,
            'POS-' || v_order_code || '-' || to_char(now(), 'HHMMSS'),
            v_total + v_tax_amount, 'paid', v_method, v_shift_id, p_created_by,
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
        'total', v_total + v_tax_amount,
        'tax_amount', v_tax_amount,
        'change_amount', v_change,
        'open_bill_status', CASE WHEN p_payment_mode = 'open_bill' THEN 'approved' ELSE 'none' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION create_pos_order(uuid, uuid, text, text, jsonb, text, text, boolean, text, numeric, numeric, text, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_pos_order(uuid, uuid, text, text, jsonb, text, text, boolean, text, numeric, numeric, text, uuid) TO service_role;