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

-- Tables (generate 32-char tokens)
INSERT INTO tables (name, token) VALUES
  ('Meja 1', gen_random_uuid()::text || gen_random_uuid()::text),
  ('Meja 2', gen_random_uuid()::text || gen_random_uuid()::text),
  ('Meja 3', gen_random_uuid()::text || gen_random_uuid()::text);
