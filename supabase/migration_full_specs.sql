-- ============================================================
-- migration_full_specs.sql
-- Supabase SQL Editor (https://supabase.com/dashboard)에서 실행
-- ============================================================

-- ===========================================
-- STEP 1: cpus / gpus 초기화 (CASCADE)
-- specs_common.cpu_id/gpu_id → cpus/gpus 참조가 있으므로 CASCADE 필수
-- ===========================================
TRUNCATE TABLE cpus CASCADE;
TRUNCATE TABLE gpus CASCADE;

-- ===========================================
-- STEP 2: products.category — smartwatch 추가
-- ===========================================
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE products ADD CONSTRAINT products_category_check
  CHECK (category IN ('laptop', 'smartphone', 'tablet', 'smartwatch'));

-- ===========================================
-- STEP 3: specs_common — 공통 스펙 확장
-- ===========================================
ALTER TABLE specs_common
  ADD COLUMN IF NOT EXISTS ram_type            text,          -- LPDDR5X, Unified Memory ...
  ADD COLUMN IF NOT EXISTS cpu_cores           integer,       -- CPU 코어 수
  ADD COLUMN IF NOT EXISTS cpu_clock           text,          -- 예: "3.5 GHz base / 4.2 GHz boost"
  ADD COLUMN IF NOT EXISTS gpu_cores           integer,       -- GPU 코어 수
  ADD COLUMN IF NOT EXISTS wifi_standard       text,          -- Wi-Fi 6E, Wi-Fi 7 ...
  ADD COLUMN IF NOT EXISTS bluetooth_version   text,          -- 5.3, 5.4 ...
  ADD COLUMN IF NOT EXISTS launch_price_usd    numeric,       -- 출시 시 기본 가격
  ADD COLUMN IF NOT EXISTS launch_year         integer,       -- 출시 연도
  ADD COLUMN IF NOT EXISTS colors              text;          -- 색상 옵션 (콤마 구분)

-- ===========================================
-- STEP 4: specs_laptop — 노트북 스펙 확장
-- ===========================================
ALTER TABLE specs_laptop
  ADD COLUMN IF NOT EXISTS display_nits        integer,       -- 최대 밝기 (nits)
  ADD COLUMN IF NOT EXISTS display_color_gamut text,          -- P3, sRGB ...
  ADD COLUMN IF NOT EXISTS display_touch       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ports               text,          -- JSON: {"usb_c":2,"hdmi":1,...}
  ADD COLUMN IF NOT EXISTS webcam_resolution   text,          -- 1080p, 720p ...
  ADD COLUMN IF NOT EXISTS has_fingerprint     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_face_id         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS charging_watt       integer;       -- 최대 충전 W

-- ===========================================
-- STEP 5: specs_smartphone — 스마트폰 스펙 확장
-- ===========================================
ALTER TABLE specs_smartphone
  ADD COLUMN IF NOT EXISTS display_nits            integer,
  ADD COLUMN IF NOT EXISTS camera_ultra_mp         numeric,   -- 초광각 MP
  ADD COLUMN IF NOT EXISTS camera_tele_mp          numeric,   -- 망원 MP
  ADD COLUMN IF NOT EXISTS camera_optical_zoom     numeric,   -- 광학 줌 배율
  ADD COLUMN IF NOT EXISTS camera_video_max        text,      -- "4K 60fps"
  ADD COLUMN IF NOT EXISTS charging_watt           integer,   -- 유선 충전 W
  ADD COLUMN IF NOT EXISTS wireless_charging_watt  integer,   -- 무선 충전 W
  ADD COLUMN IF NOT EXISTS has_5g                  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wifi_standard           text,
  ADD COLUMN IF NOT EXISTS bluetooth_version       text,
  ADD COLUMN IF NOT EXISTS ip_rating               text,      -- IP68 ...
  ADD COLUMN IF NOT EXISTS has_nfc                 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS thickness_mm            numeric;

-- ===========================================
-- STEP 6: specs_tablet — 태블릿 스펙 확장
-- ===========================================
ALTER TABLE specs_tablet
  ADD COLUMN IF NOT EXISTS display_nits            integer,
  ADD COLUMN IF NOT EXISTS display_touch           boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS keyboard_support        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS charging_watt           integer,
  ADD COLUMN IF NOT EXISTS wireless_charging_watt  integer,
  ADD COLUMN IF NOT EXISTS wifi_standard           text,
  ADD COLUMN IF NOT EXISTS bluetooth_version       text,
  ADD COLUMN IF NOT EXISTS ip_rating               text,
  ADD COLUMN IF NOT EXISTS camera_main_mp          numeric,
  ADD COLUMN IF NOT EXISTS camera_front_mp         numeric,
  ADD COLUMN IF NOT EXISTS battery_hours           numeric;

-- ===========================================
-- STEP 7: specs_smartwatch 신규 테이블
-- ===========================================
CREATE TABLE IF NOT EXISTS specs_smartwatch (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  display_inch     numeric,
  display_type     text,            -- OLED, LTPO OLED ...
  chip_name        text,            -- S10, S9 Ultra ...
  battery_hours    numeric,         -- 배터리 실사용 시간
  health_sensors   text,            -- "heart_rate,spo2,ecg,temperature" (콤마 구분)
  has_gps          boolean DEFAULT false,
  water_resistance text,            -- IP68, 100m, WR50 ...
  cellular         boolean DEFAULT false,
  weight_g         numeric,
  compatible_os    text,            -- ios | android | both
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specs_smartwatch_product ON specs_smartwatch(product_id);
