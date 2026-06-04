-- ============================================================
-- NİKAH ŞEKER SİPARİŞ YÖNETİMİ - SUPABASE KURULUM
-- ============================================================

-- PRODUCTS tablosu
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  bulk_threshold INT DEFAULT 200,
  bulk_price NUMERIC(10,2) DEFAULT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS bulk_threshold INT DEFAULT 200;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bulk_price NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

-- INGREDIENTS tablosu
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchase_quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'adet',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCT_INGREDIENTS
CREATE TABLE IF NOT EXISTS product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  usage_per_unit NUMERIC(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS tablosu
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  -- Eski tek-ürün alanları (geriye dönük uyumluluk)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  design_name TEXT NOT NULL DEFAULT '',
  design_text TEXT NOT NULL DEFAULT '',
  delivery_date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'bekliyor'
    CHECK (status IN ('bekliyor','hazirlanıyor','hazır','kargoya verildi','teslim edildi','iptal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- orders tablosundaki status constraint'i güncelle (türkçe karakterler)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('bekliyor','hazırlanıyor','hazır','kargoya verildi','teslim edildi','iptal'));

-- Yeni alanlar
ALTER TABLE orders ADD COLUMN IF NOT EXISTS instagram_username TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ORDER_ITEMS tablosu (çok ürünlü sipariş desteği)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  design_name TEXT NOT NULL DEFAULT '',
  design_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COSTS tablosu
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Genel',
  date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='allow_all_products') THEN
    CREATE POLICY allow_all_products ON products FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ingredients' AND policyname='allow_all_ingredients') THEN
    CREATE POLICY allow_all_ingredients ON ingredients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_ingredients' AND policyname='allow_all_pi') THEN
    CREATE POLICY allow_all_pi ON product_ingredients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='allow_all_orders') THEN
    CREATE POLICY allow_all_orders ON orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='allow_all_order_items') THEN
    CREATE POLICY allow_all_order_items ON order_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='costs' AND policyname='allow_all_costs') THEN
    CREATE POLICY allow_all_costs ON costs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- STORAGE - product-images bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='product_images_public_read') THEN
    CREATE POLICY product_images_public_read ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='product_images_upload') THEN
    CREATE POLICY product_images_upload ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='product_images_update') THEN
    CREATE POLICY product_images_update ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='product_images_delete') THEN
    CREATE POLICY product_images_delete ON storage.objects FOR DELETE USING (bucket_id = 'product-images');
  END IF;
END $$;
