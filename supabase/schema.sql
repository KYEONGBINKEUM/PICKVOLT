-- ======================================
-- PICKVOLT v2 여행 미디어 DB 스키마
-- ======================================

-- 카테고리 (지역)
CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,         -- 'seoul', 'busan', 'jeju'
  name TEXT NOT NULL,                -- '서울', '부산', '제주'
  name_en TEXT,                      -- 'Seoul', 'Busan'
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 태그
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,         -- 'food', 'cafe', 'hotel'
  name TEXT NOT NULL                 -- '맛집', '카페', '숙소'
);

-- 게시글 (핵심 테이블)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,         -- URL용: 'seoul-gyeongbokgung-2026'
  title TEXT NOT NULL,
  subtitle TEXT,                     -- 부제목
  content TEXT NOT NULL,             -- 본문 (마크다운)
  excerpt TEXT,                      -- 미리보기 요약 (SEO용)
  thumbnail_url TEXT,                -- 대표 이미지
  region_id INTEGER REFERENCES regions(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- 통계
  view_count INTEGER DEFAULT 0,

  -- 날짜
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 게시글 ↔ 태그 연결
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- ======================================
-- 기본 데이터 삽입
-- ======================================

INSERT INTO regions (slug, name, name_en, description) VALUES
  ('seoul',     '서울',   'Seoul',     '대한민국 수도 서울의 여행 정보'),
  ('busan',     '부산',   'Busan',     '바다와 음식의 도시 부산 여행 가이드'),
  ('jeju',      '제주',   'Jeju',      '제주도 완벽 여행 가이드'),
  ('gyeongju',  '경주',   'Gyeongju',  '역사와 문화의 도시 경주 여행'),
  ('gangneung', '강릉',   'Gangneung', '동해와 커피의 도시 강릉 여행'),
  ('jeonju',    '전주',   'Jeonju',    '한옥마을과 맛의 도시 전주 여행');

INSERT INTO tags (slug, name) VALUES
  ('food',     '맛집'),
  ('cafe',     '카페'),
  ('hotel',    '숙소'),
  ('course',   '여행코스'),
  ('nature',   '자연'),
  ('culture',  '문화'),
  ('shopping', '쇼핑'),
  ('transport','교통');

-- ======================================
-- 조회수 자동 증가 함수
-- ======================================

CREATE OR REPLACE FUNCTION increment_view_count(post_slug TEXT)
RETURNS VOID AS $$
  UPDATE posts SET view_count = view_count + 1 WHERE slug = post_slug;
$$ LANGUAGE SQL;

-- ======================================
-- updated_at 자동 갱신 트리거
-- ======================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ======================================
-- RLS (Row Level Security)
-- ======================================

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

-- 누구나 published 글은 읽을 수 있음
CREATE POLICY "published posts are public"
  ON posts FOR SELECT
  USING (status = 'published');

-- regions, tags, post_tags 전체 공개 읽기
CREATE POLICY "regions are public"
  ON regions FOR SELECT USING (true);

CREATE POLICY "tags are public"
  ON tags FOR SELECT USING (true);

CREATE POLICY "post_tags are public"
  ON post_tags FOR SELECT USING (true);
