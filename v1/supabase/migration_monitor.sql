-- ============================================================
-- migration_monitor.sql
-- Supabase SQL Editor에서 실행
-- monitor 카테고리 + specs_monitor 테이블 추가
-- ============================================================

-- STEP 1: products.category에 monitor 추가
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('laptop', 'smartphone', 'tablet', 'smartwatch', 'monitor'));

-- STEP 2: specs_monitor 테이블 생성
CREATE TABLE IF NOT EXISTS specs_monitor (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  display_inch        numeric,
  display_resolution  text,        -- 예: "2560x1440", "3840x2160"
  display_hz          integer,     -- 최대 주사율
  display_type        text,        -- IPS | VA | OLED | TN | QLED
  display_nits        integer,     -- 최대 밝기
  display_color_gamut text,        -- sRGB, DCI-P3, Adobe RGB
  response_time_ms    numeric,     -- 응답 속도 (ms)
  ports               text,        -- JSON: {"hdmi":2, "dp":1, "usb_c":1, ...}
  has_usb_hub         boolean DEFAULT false,
  has_webcam          boolean DEFAULT false,
  has_speakers        boolean DEFAULT false,
  panel_type          text,        -- curved | flat
  vesa_compatible     boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specs_monitor_product ON specs_monitor(product_id);
