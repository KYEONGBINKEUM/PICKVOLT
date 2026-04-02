-- ============================================================
-- Product DB schema — run this in Supabase SQL Editor
-- ============================================================

-- Products (all categories)
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  brand text not null,
  category text not null check (category in ('laptop', 'smartphone', 'tablet')),
  price_usd numeric,
  image_url text,
  source_url text,
  scrape_status text default 'pending' check (scrape_status in ('ok', 'failed', 'partial', 'pending')),
  scrape_source text,   -- 'icecat' | 'official_site' | 'manual'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Common hardware specs (shared across categories)
create table if not exists specs_common (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade unique,
  cpu_name text,
  cpu_id uuid references cpus(id),
  gpu_name text,
  gpu_id uuid references gpus(id),
  ram_gb numeric,
  storage_gb numeric,
  storage_type text,   -- SSD | HDD | eMMC
  os text,
  created_at timestamptz default now()
);

-- Laptop-specific specs
create table if not exists specs_laptop (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade unique,
  display_inch numeric,
  display_resolution text,
  display_hz integer,
  display_type text,   -- IPS | OLED | AMOLED | VA | TN
  weight_kg numeric,
  battery_wh numeric,
  battery_hours numeric,
  created_at timestamptz default now()
);

-- Smartphone-specific specs
create table if not exists specs_smartphone (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade unique,
  display_inch numeric,
  display_resolution text,
  display_hz integer,
  display_type text,
  weight_g numeric,
  battery_mah integer,
  camera_main_mp numeric,
  camera_front_mp numeric,
  created_at timestamptz default now()
);

-- Tablet-specific specs
create table if not exists specs_tablet (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade unique,
  display_inch numeric,
  display_resolution text,
  display_hz integer,
  display_type text,
  weight_g numeric,
  battery_mah integer,
  stylus_support boolean default false,
  cellular boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_products_brand on products(brand);
create index if not exists idx_products_category on products(category);
create index if not exists idx_products_scrape_status on products(scrape_status);
create index if not exists idx_specs_common_product on specs_common(product_id);
create index if not exists idx_specs_common_cpu on specs_common(cpu_id);
create index if not exists idx_specs_common_gpu on specs_common(gpu_id);
