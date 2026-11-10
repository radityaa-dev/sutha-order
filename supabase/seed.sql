-- Categories
INSERT INTO categories (name, sort_order) VALUES ('Makanan', 1), ('Minuman', 2), ('Snack', 3);

-- Menus
WITH food AS (SELECT id FROM categories WHERE name = 'Makanan'),
     drink AS (SELECT id FROM categories WHERE name = 'Minuman'),
     snack AS (SELECT id FROM categories WHERE name = 'Snack')
INSERT INTO menus (category_id, name, description, price, image_url, is_available) VALUES
  ((SELECT id FROM food), 'Nasi Goreng Spesial', 'Nasi goreng dengan telur, ayam, sayuran', 35000, NULL, true),
  ((SELECT id FROM food), 'Ayam Goreng Krispi', 'Ayam goreng krispi dengan sambal', 45000, NULL, true),
  ((SELECT id FROM food), 'Mie Goreng Jawa', 'Mie goreng dengan telur dan udang', 30000, NULL, true),
  ((SELECT id FROM drink), 'Es Teh Manis', 'Teh manis dingin', 8000, NULL, true),
  ((SELECT id FROM drink), 'Es Jeruk', 'Jeruk peras dingin', 12000, NULL, true),
  ((SELECT id FROM drink), 'Kopi Hitam', 'Kopi hitam kental', 15000, NULL, true),
  ((SELECT id FROM snack), 'Kentang Goreng', 'Kentang goreng renyah', 20000, NULL, true),
  ((SELECT id FROM snack), 'Roti Bakar', 'Roti bakar coklat keju', 18000, NULL, true);

-- Tables (generate 12-char Base62 tokens)
INSERT INTO tables (name, token) VALUES
  ('Meja 1', substring(md5(random()::text) from 1 for 12)),
  ('Meja 2', substring(md5(random()::text) from 1 for 12)),
  ('Meja 3', substring(md5(random()::text) from 1 for 12));

-- Modifier Groups
INSERT INTO modifier_groups (id, name, selection_type, is_required, min_select, max_select, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Level Pedas', 'single', true, 1, 1, 1),
  ('22222222-2222-2222-2222-222222222222', 'Topping', 'multiple', false, 0, 3, 2),
  ('33333333-3333-3333-3333-333333333333', 'Suhu', 'single', true, 1, 1, 3);

-- Modifier Options
INSERT INTO modifier_options (group_id, name, price_delta, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tidak Pedas', 0, 1),
  ('11111111-1111-1111-1111-111111111111', 'Sedang', 0, 2),
  ('11111111-1111-1111-1111-111111111111', 'Pedas', 0, 3),
  ('22222222-2222-2222-2222-222222222222', 'Telur', 3000, 1),
  ('22222222-2222-2222-2222-222222222222', 'Keju', 4000, 2),
  ('33333333-3333-3333-3333-333333333333', 'Panas', 0, 1),
  ('33333333-3333-3333-3333-333333333333', 'Dingin', 0, 2);

-- Assign Modifiers to Menus
WITH nasgor AS (SELECT id FROM menus WHERE name = 'Nasi Goreng Spesial'),
     es_teh AS (SELECT id FROM menus WHERE name = 'Es Teh Manis')
INSERT INTO menu_modifier_groups (menu_id, group_id) VALUES
  ((SELECT id FROM nasgor), '11111111-1111-1111-1111-111111111111'),
  ((SELECT id FROM nasgor), '22222222-2222-2222-2222-222222222222'),
  ((SELECT id FROM es_teh), '33333333-3333-3333-3333-333333333333');
