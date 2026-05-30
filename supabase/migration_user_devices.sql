-- 사용자 기기 등록 테이블
create table if not exists user_devices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

-- RLS
alter table user_devices enable row level security;

create policy "users can read own devices"
  on user_devices for select
  using (auth.uid() = user_id);

create policy "users can insert own devices"
  on user_devices for insert
  with check (auth.uid() = user_id);

create policy "users can delete own devices"
  on user_devices for delete
  using (auth.uid() = user_id);
