-- ============================================================
-- migration_articles.sql
-- 언론사형 콘텐츠 허브: 기사(articles) 테이블
-- community_posts와는 완전히 분리된 신규 테이블
-- Supabase SQL Editor에 붙여넣고 실행
-- ============================================================

create table if not exists articles (
  id               uuid        primary key default gen_random_uuid(),
  author_id        uuid        not null references auth.users(id) on delete cascade,
  author_name      text        not null default '',
  slug             text        not null unique,
  title            text        not null,
  summary          text        not null default '',
  content_html     text        not null default '',
  category         text        not null check (category in ('tech', 'it', 'ai', 'mobile', 'review', 'security', 'startup')),
  tags             text[]      not null default '{}',
  thumbnail_url    text,
  status           text        not null default 'draft' check (status in ('draft', 'unlisted', 'public')),
  view_count       int         not null default 0,
  read_minutes     int         not null default 1,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table articles enable row level security;

-- public/unlisted는 누구나 조회, draft는 작성자 본인만
create policy "articles_select" on articles for select
  using (status in ('public', 'unlisted') or auth.uid() = author_id);
create policy "articles_insert" on articles for insert with check (auth.uid() = author_id);
create policy "articles_update" on articles for update using (auth.uid() = author_id);
create policy "articles_delete" on articles for delete using (auth.uid() = author_id);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_articles_category_published on articles (category, published_at desc) where status = 'public';
create index if not exists idx_articles_popular on articles (view_count desc) where status = 'public';
create index if not exists idx_articles_slug on articles (slug);

-- ============================================================
-- Storage bucket (기사 썸네일/본문 이미지)
-- Supabase Dashboard → Storage에서 수동 생성이 필요할 수 있음.
-- 아래는 SQL로 생성 시도 (storage.buckets에 직접 insert 가능한 프로젝트 기준).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

create policy "article_images_public_read" on storage.objects for select
  using (bucket_id = 'article-images');
create policy "article_images_auth_upload" on storage.objects for insert
  with check (bucket_id = 'article-images' and auth.role() = 'authenticated');
