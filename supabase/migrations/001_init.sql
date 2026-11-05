CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int DEFAULT 0
);

CREATE TABLE menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id),
  name text NOT NULL,
  description text,
  price int NOT NULL,
  image_url text,
  is_available bool DEFAULT true
);

CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  token text UNIQUE NOT NULL,
  is_active bool DEFAULT true
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text UNIQUE NOT NULL,
  table_id uuid REFERENCES tables(id),
  customer_name text,
  notes text,
  total int NOT NULL,
  order_status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  menu_id uuid REFERENCES menus(id),
  menu_name text NOT NULL,
  price int NOT NULL,
  qty int NOT NULL,
  notes text
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  transaction_id text,
  payment_method text,
  amount int NOT NULL,
  status text,
  paid_at timestamptz,
  raw_payload jsonb
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public select categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated insert categories" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public select menus" ON menus FOR SELECT USING (true);
CREATE POLICY "Authenticated insert menus" ON menus FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Public select tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Authenticated insert tables" ON tables FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);
CREATE POLICY "Public read menu-images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Authenticated write menu-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
