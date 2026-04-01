-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Comparison history
create table if not exists comparison_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  products text[] not null,
  result jsonb,
  pinned boolean default false,
  created_at timestamptz default now()
);

-- User preferences
create table if not exists user_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  budget integer default 3 check (budget between 1 and 5),
  photography integer default 3 check (photography between 1 and 5),
  performance integer default 3 check (performance between 1 and 5),
  battery integer default 3 check (battery between 1 and 5),
  updated_at timestamptz default now()
);

-- Pro subscriptions
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique,
  polar_subscription_id text unique,
  status text default 'free' check (status in ('free', 'pro', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table comparison_history enable row level security;
alter table user_preferences enable row level security;
alter table subscriptions enable row level security;

-- Policies: users can only access their own data
create policy "users own their history"
  on comparison_history for all
  using (auth.uid() = user_id);

create policy "users own their preferences"
  on user_preferences for all
  using (auth.uid() = user_id);

create policy "users see their subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Indexes
create index on comparison_history (user_id, created_at desc);
create index on user_preferences (user_id);
