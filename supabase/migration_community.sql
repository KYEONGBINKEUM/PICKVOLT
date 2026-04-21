-- ============================================================
-- migration_community.sql
-- 커뮤니티 시스템: 리뷰 / 포럼 / 비교투표
-- Supabase SQL Editor에 붙여넣고 실행
-- ============================================================

-- ── 1. 게시물 테이블 ──────────────────────────────────────────
create table if not exists community_posts (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references auth.users(id) on delete cascade,
  user_display_name text        not null default '',
  user_avatar_url   text,
  type              text        not null check (type in ('review', 'forum', 'compare')),
  category          text        check (category in ('laptop', 'mobile', 'tablet', 'other')),
  title             text        not null,
  body              text        not null default '',
  rating            numeric(3,1) check (rating is null or (rating >= 1 and rating <= 10)),
  upvotes           int         not null default 0,
  comment_count     int         not null default 0,
  view_count        int         not null default 0,
  is_pinned         boolean     not null default false,
  is_hidden         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 2. 게시물 ↔ 제품 연결 (선택사항) ─────────────────────────
--   글 작성 시 제품을 태그하면 해당 제품 상세 페이지에 노출
create table if not exists community_post_products (
  post_id    uuid not null references community_posts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (post_id, product_id)
);

-- ── 3. 비교투표 옵션 (type='compare' 전용) ──────────────────
create table if not exists community_compare_options (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references community_posts(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  label       text not null,
  image_url   text,
  vote_count  int  not null default 0,
  sort_order  int  not null default 0
);

-- ── 4. 게시물 추천 (upvote) ──────────────────────────────────
create table if not exists community_post_votes (
  post_id    uuid not null references community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ── 5. 비교투표 선택 ─────────────────────────────────────────
create table if not exists community_compare_votes (
  post_id    uuid not null references community_posts(id) on delete cascade,
  option_id  uuid not null references community_compare_options(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)   -- 게시물당 1표
);

-- ── 6. 댓글 ──────────────────────────────────────────────────
create table if not exists community_comments (
  id                uuid        primary key default gen_random_uuid(),
  post_id           uuid        not null references community_posts(id) on delete cascade,
  user_id           uuid        not null references auth.users(id) on delete cascade,
  user_display_name text        not null default '',
  user_avatar_url   text,
  parent_id         uuid        references community_comments(id) on delete cascade,
  body              text        not null,
  upvotes           int         not null default 0,
  is_hidden         boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── 7. 댓글 추천 ──────────────────────────────────────────────
create table if not exists community_comment_votes (
  comment_id uuid not null references community_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);


-- ============================================================
-- RLS
-- ============================================================
alter table community_posts           enable row level security;
alter table community_post_products   enable row level security;
alter table community_compare_options enable row level security;
alter table community_post_votes      enable row level security;
alter table community_compare_votes   enable row level security;
alter table community_comments        enable row level security;
alter table community_comment_votes   enable row level security;

-- posts: 비공개 글은 작성자만 조회
create policy "cp_select"  on community_posts for select using (not is_hidden or auth.uid() = user_id);
create policy "cp_insert"  on community_posts for insert with check (auth.uid() = user_id);
create policy "cp_update"  on community_posts for update using (auth.uid() = user_id);
create policy "cp_delete"  on community_posts for delete using (auth.uid() = user_id);

-- post_products: 누구나 읽기, 작성자만 수정
create policy "cpp_select" on community_post_products for select using (true);
create policy "cpp_insert" on community_post_products for insert with check (
  exists (select 1 from community_posts where id = post_id and user_id = auth.uid())
);
create policy "cpp_delete" on community_post_products for delete using (
  exists (select 1 from community_posts where id = post_id and user_id = auth.uid())
);

-- compare_options: 누구나 읽기, 작성자만 생성
create policy "cco_select" on community_compare_options for select using (true);
create policy "cco_insert" on community_compare_options for insert with check (
  exists (select 1 from community_posts where id = post_id and user_id = auth.uid())
);

-- post_votes: 누구나 읽기, 본인만 투표
create policy "cpv_select" on community_post_votes for select using (true);
create policy "cpv_insert" on community_post_votes for insert with check (auth.uid() = user_id);
create policy "cpv_delete" on community_post_votes for delete using (auth.uid() = user_id);

-- compare_votes
create policy "ccv_select" on community_compare_votes for select using (true);
create policy "ccv_insert" on community_compare_votes for insert with check (auth.uid() = user_id);
create policy "ccv_delete" on community_compare_votes for delete using (auth.uid() = user_id);

-- comments
create policy "cc_select"  on community_comments for select using (not is_hidden or auth.uid() = user_id);
create policy "cc_insert"  on community_comments for insert with check (auth.uid() = user_id);
create policy "cc_update"  on community_comments for update using (auth.uid() = user_id);
create policy "cc_delete"  on community_comments for delete using (auth.uid() = user_id);

-- comment_votes
create policy "ccmv_select" on community_comment_votes for select using (true);
create policy "ccmv_insert" on community_comment_votes for insert with check (auth.uid() = user_id);
create policy "ccmv_delete" on community_comment_votes for delete using (auth.uid() = user_id);


-- ============================================================
-- Triggers — 카운터 자동 업데이트 + 포인트 지급
-- ============================================================

-- 글 작성 시 포인트 +3
create or replace function _cp_on_post_insert()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles set points = points + 3 where user_id = new.user_id;
  insert into public.point_transactions(user_id, amount, reason, reference_id)
  values (new.user_id, 3, 'community_post', new.id::text);
  return null;
end;
$$;
create trigger trg_cp_post_insert
  after insert on community_posts
  for each row execute function _cp_on_post_insert();

-- 게시물 추천 토글 → upvotes 카운터 + 작성자 포인트 ±1
create or replace function _cp_on_post_vote()
returns trigger language plpgsql security definer as $$
declare v_author uuid;
begin
  if tg_op = 'INSERT' then
    update community_posts set upvotes = upvotes + 1 where id = new.post_id returning user_id into v_author;
    update public.profiles set points = points + 1 where user_id = v_author;
  elsif tg_op = 'DELETE' then
    update community_posts set upvotes = greatest(0, upvotes - 1) where id = old.post_id returning user_id into v_author;
    update public.profiles set points = greatest(0, points - 1) where user_id = v_author;
  end if;
  return null;
end;
$$;
create trigger trg_cp_post_vote
  after insert or delete on community_post_votes
  for each row execute function _cp_on_post_vote();

-- 댓글 작성/삭제 → comment_count + 작성자 포인트 +1
create or replace function _cp_on_comment()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update community_posts set comment_count = comment_count + 1 where id = new.post_id;
    update public.profiles set points = points + 1 where user_id = new.user_id;
  elsif tg_op = 'DELETE' then
    update community_posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$;
create trigger trg_cp_comment
  after insert or delete on community_comments
  for each row execute function _cp_on_comment();

-- 댓글 추천 → upvotes
create or replace function _cp_on_comment_vote()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update community_comments set upvotes = upvotes + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update community_comments set upvotes = greatest(0, upvotes - 1) where id = old.comment_id;
  end if;
  return null;
end;
$$;
create trigger trg_cp_comment_vote
  after insert or delete on community_comment_votes
  for each row execute function _cp_on_comment_vote();

-- 비교투표 → vote_count
create or replace function _cp_on_compare_vote()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update community_compare_options set vote_count = vote_count + 1 where id = new.option_id;
  elsif tg_op = 'DELETE' then
    update community_compare_options set vote_count = greatest(0, vote_count - 1) where id = old.option_id;
  end if;
  return null;
end;
$$;
create trigger trg_cp_compare_vote
  after insert or delete on community_compare_votes
  for each row execute function _cp_on_compare_vote();


-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_cposts_type     on community_posts(type, created_at desc);
create index if not exists idx_cposts_category on community_posts(category, created_at desc);
create index if not exists idx_cposts_user     on community_posts(user_id);
create index if not exists idx_cposts_upvotes  on community_posts(upvotes desc);
create index if not exists idx_cpp_product     on community_post_products(product_id);
create index if not exists idx_ccomments_post  on community_comments(post_id, created_at);
create index if not exists idx_cco_post        on community_compare_options(post_id, sort_order);
create index if not exists idx_ccv_option      on community_compare_votes(option_id);
