-- RSS 봇 포스팅을 위한 community_posts 컬럼 추가

-- user_id nullable (봇 게시물은 user 없음)
ALTER TABLE community_posts ALTER COLUMN user_id DROP NOT NULL;

-- 중복 방지용 source_url (UNIQUE), 출처 표시용 source_name, 봇 여부 플래그
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS source_url  TEXT UNIQUE;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_bot      BOOLEAN NOT NULL DEFAULT false;

-- 중복 체크 쿼리 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_community_posts_source_url ON community_posts (source_url)
  WHERE source_url IS NOT NULL;
