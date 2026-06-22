-- Run this in your Supabase SQL editor
create table if not exists category_settings (
  category    text primary key,
  is_visible  boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table category_settings enable row level security;

-- Public read
create policy "Public can read category_settings"
  on category_settings for select using (true);

-- Service role can write (API routes use service key)
insert into category_settings (category, is_visible) values
  ('smartphone', true),
  ('laptop',     true),
  ('tablet',     true),
  ('smartwatch', true),
  ('headphones', true),
  ('monitor',    true),
  ('tv',         true),
  ('car',        true)
on conflict (category) do nothing;
