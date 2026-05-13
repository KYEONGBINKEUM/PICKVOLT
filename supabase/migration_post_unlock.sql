-- Add point_price to community_posts (0 = free)
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS point_price integer NOT NULL DEFAULT 0;

-- Track which users have unlocked which posts
CREATE TABLE IF NOT EXISTS community_post_unlocks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_unlocks_user ON community_post_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_post_unlocks_post ON community_post_unlocks(post_id);

-- Atomic unlock: deduct points from viewer, credit author, record transaction & unlock
CREATE OR REPLACE FUNCTION unlock_post(p_post_id uuid, p_viewer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price      integer;
  v_author_id  uuid;
  v_viewer_pts integer;
BEGIN
  SELECT point_price, user_id INTO v_price, v_author_id
  FROM community_posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'post_not_found');
  END IF;

  IF v_price = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'post_is_free');
  END IF;

  IF EXISTS (
    SELECT 1 FROM community_post_unlocks
    WHERE post_id = p_post_id AND user_id = p_viewer_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_unlocked');
  END IF;

  SELECT points INTO v_viewer_pts FROM profiles WHERE id = p_viewer_id;

  IF v_viewer_pts IS NULL OR v_viewer_pts < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points');
  END IF;

  -- Deduct from viewer
  UPDATE profiles SET points = points - v_price WHERE id = p_viewer_id;

  -- Credit author (skip if bot post or self-unlock)
  IF v_author_id IS NOT NULL AND v_author_id <> p_viewer_id THEN
    UPDATE profiles SET points = points + v_price WHERE id = v_author_id;
    INSERT INTO point_transactions (user_id, amount, reason, reference_id)
    VALUES (v_author_id, v_price, 'post_unlock_received', p_post_id);
  END IF;

  -- Log deduction for viewer
  INSERT INTO point_transactions (user_id, amount, reason, reference_id)
  VALUES (p_viewer_id, -v_price, 'post_unlock_spent', p_post_id);

  -- Record unlock
  INSERT INTO community_post_unlocks (post_id, user_id)
  VALUES (p_post_id, p_viewer_id);

  RETURN jsonb_build_object('success', true, 'points_spent', v_price);
END;
$$;
