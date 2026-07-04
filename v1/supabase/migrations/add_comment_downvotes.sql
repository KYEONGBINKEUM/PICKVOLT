-- Add downvotes column to community_comments
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS downvotes integer DEFAULT 0;

-- Create downvotes tracking table
CREATE TABLE IF NOT EXISTS community_comment_downvotes (
  comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
