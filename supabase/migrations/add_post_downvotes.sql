-- Add downvotes column to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS downvotes integer NOT NULL DEFAULT 0;

-- Create post downvotes tracking table
CREATE TABLE IF NOT EXISTS community_post_downvotes (
  post_id    uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE community_post_downvotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpdv_select" ON community_post_downvotes FOR SELECT USING (true);
CREATE POLICY "cpdv_insert" ON community_post_downvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cpdv_delete" ON community_post_downvotes FOR DELETE USING (auth.uid() = user_id);
