-- Community settings table for admin-configurable values
CREATE TABLE IF NOT EXISTS app_settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

-- Default community point rewards
INSERT INTO app_settings (key, value) VALUES
  ('community_points_per_post',    '5'),
  ('community_points_per_comment', '1')
ON CONFLICT (key) DO NOTHING;
