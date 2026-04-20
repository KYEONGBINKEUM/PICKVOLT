-- Product variants: same model, different CPU/GPU/RAM/storage configurations
-- Run this in Supabase SQL Editor

create table if not exists product_variants (
  id            uuid    primary key default gen_random_uuid(),
  product_id    uuid    not null references products(id) on delete cascade,
  variant_name  text    not null,   -- e.g. "Core Ultra 9 + RTX 4080 / 32GB"
  cpu_name      text,
  cpu_id        uuid    references cpus(id),
  gpu_name      text,
  gpu_id        uuid    references gpus(id),
  ram_gb        text,               -- "32" or "32, 64"
  storage_gb    text,               -- "1024" or "512, 1024"
  price_usd     numeric,
  source_url    text,
  sort_order    int     default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_product_variants_product on product_variants(product_id);
