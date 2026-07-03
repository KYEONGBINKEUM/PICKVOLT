-- Run this in your Supabase SQL editor
create table if not exists blog_category_settings (
  category    text primary key,
  is_visible  boolean not null default false,
  updated_at  timestamptz not null default now()
);

alter table blog_category_settings enable row level security;

-- Public read
create policy "Public can read blog_category_settings"
  on blog_category_settings for select using (true);

-- Service role can write (API routes use service key)
-- Launch with only "모바일" visible; the rest stay hidden until content is ready
insert into blog_category_settings (category, is_visible) values
  ('ai',            false),
  ('mobile',        true),
  ('pc_laptop',     false),
  ('hardware',      false),
  ('software',      false),
  ('platform',      false),
  ('security',      false),
  ('cloud',         false),
  ('semiconductor', false),
  ('game',          false),
  ('mobility',      false)
on conflict (category) do nothing;
