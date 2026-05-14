-- AI 봇 글/댓글 컬럼 추가
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_character TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_requester_name TEXT DEFAULT NULL;

ALTER TABLE public.community_comments
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_character TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_requester_name TEXT DEFAULT NULL;

-- AI 봇 포인트 설정 기본값
INSERT INTO app_settings (key, value) VALUES
  ('ai_bot_post_points',    '50'),
  ('ai_bot_comment_points', '20')
ON CONFLICT (key) DO NOTHING;
