-- Fix: unlock_post function used WHERE id = p_viewer_id
-- but profiles table uses user_id column (not id).
-- This caused v_viewer_pts to always be NULL → insufficient_points always returned
-- → points were never deducted and no transactions were recorded.

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

  -- FIXED: use user_id (not id) to look up the viewer's profile
  SELECT points INTO v_viewer_pts FROM profiles WHERE user_id = p_viewer_id;

  IF v_viewer_pts IS NULL OR v_viewer_pts < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points');
  END IF;

  -- FIXED: use user_id to deduct from viewer
  UPDATE profiles SET points = points - v_price WHERE user_id = p_viewer_id;

  -- Credit author (skip if bot post or self-unlock)
  IF v_author_id IS NOT NULL AND v_author_id <> p_viewer_id THEN
    -- FIXED: use user_id to credit author
    UPDATE profiles SET points = points + v_price WHERE user_id = v_author_id;
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
