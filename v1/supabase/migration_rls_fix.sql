-- ============================================================
-- RLS 전체 보안 패치
-- Supabase 보안 경고: rls_disabled_in_public 해결
-- ============================================================
-- 실행 방법: Supabase Dashboard → SQL Editor에 전체 붙여넣기 후 Run
-- ============================================================

-- ── 1. products ──────────────────────────────────────────────
-- 누구나 읽기 가능, 쓰기는 service_role만 (API 라우트)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products: public read"
  ON products FOR SELECT USING (true);

-- ── 2. product_variants ──────────────────────────────────────
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_variants: public read"
  ON product_variants FOR SELECT USING (true);

-- ── 3. cpus ──────────────────────────────────────────────────
ALTER TABLE cpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpus: public read"
  ON cpus FOR SELECT USING (true);

-- ── 4. gpus ──────────────────────────────────────────────────
ALTER TABLE gpus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gpus: public read"
  ON gpus FOR SELECT USING (true);

-- ── 5. specs_common ──────────────────────────────────────────
ALTER TABLE specs_common ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_common: public read"
  ON specs_common FOR SELECT USING (true);

-- ── 6. specs_laptop ──────────────────────────────────────────
ALTER TABLE specs_laptop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_laptop: public read"
  ON specs_laptop FOR SELECT USING (true);

-- ── 7. specs_smartphone ──────────────────────────────────────
ALTER TABLE specs_smartphone ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_smartphone: public read"
  ON specs_smartphone FOR SELECT USING (true);

-- ── 8. specs_tablet ──────────────────────────────────────────
ALTER TABLE specs_tablet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_tablet: public read"
  ON specs_tablet FOR SELECT USING (true);

-- ── 9. specs_smartwatch ──────────────────────────────────────
ALTER TABLE specs_smartwatch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_smartwatch: public read"
  ON specs_smartwatch FOR SELECT USING (true);

-- ── 10. specs_monitor ────────────────────────────────────────
ALTER TABLE specs_monitor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specs_monitor: public read"
  ON specs_monitor FOR SELECT USING (true);

-- ── 11. tech_events ──────────────────────────────────────────
ALTER TABLE tech_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tech_events: public read approved"
  ON tech_events FOR SELECT USING (is_approved = true);

-- ── 12. comparison_verdicts ──────────────────────────────────
ALTER TABLE comparison_verdicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comparison_verdicts: public read"
  ON comparison_verdicts FOR SELECT USING (true);

-- ── 13. profiles ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 공개 프로필 정보는 누구나 읽기 가능
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (true);

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- ── 14. reviews ──────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "reviews: own insert"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews: own update"
  ON reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "reviews: own delete"
  ON reviews FOR DELETE USING (auth.uid() = user_id);

-- ── 15. review_likes ─────────────────────────────────────────
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_likes: public read"
  ON review_likes FOR SELECT USING (true);

CREATE POLICY "review_likes: own insert"
  ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "review_likes: own delete"
  ON review_likes FOR DELETE USING (auth.uid() = user_id);

-- ── 16. wishlists ────────────────────────────────────────────
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists: own read"
  ON wishlists FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlists: own insert"
  ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlists: own delete"
  ON wishlists FOR DELETE USING (auth.uid() = user_id);

-- ── 17. community_comment_downvotes ──────────────────────────
ALTER TABLE community_comment_downvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_downvotes: public read"
  ON community_comment_downvotes FOR SELECT USING (true);

CREATE POLICY "comment_downvotes: own insert"
  ON community_comment_downvotes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_downvotes: own delete"
  ON community_comment_downvotes FOR DELETE USING (auth.uid() = user_id);

-- ── 18. community_post_unlocks ───────────────────────────────
ALTER TABLE community_post_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_unlocks: own read"
  ON community_post_unlocks FOR SELECT USING (auth.uid() = user_id);

-- ── 19. community_reports ────────────────────────────────────
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_reports: own read"
  ON community_reports FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "community_reports: own insert"
  ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ── 20. notifications ────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: own read"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications: own update"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── 21. clans ────────────────────────────────────────────────
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clans: public read"
  ON clans FOR SELECT USING (true);

-- ── 22. clan_members ─────────────────────────────────────────
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clan_members: public read"
  ON clan_members FOR SELECT USING (true);

CREATE POLICY "clan_members: own insert"
  ON clan_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clan_members: own delete"
  ON clan_members FOR DELETE USING (auth.uid() = user_id);

-- ── 23. newsletter_subscribers ───────────────────────────────
-- service_role만 접근 (일반 사용자 직접 접근 차단)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = service_role만 접근 가능

-- ── 24. app_settings ─────────────────────────────────────────
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_settings: public read"
  ON app_settings FOR SELECT USING (true);

-- ── 25. contact_inquiries ────────────────────────────────────
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_inquiries: own read"
  ON contact_inquiries FOR SELECT USING (auth.uid() = user_id);

-- ── 26. product_edit_requests ────────────────────────────────
ALTER TABLE product_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edit_requests: own read"
  ON product_edit_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "edit_requests: own insert"
  ON product_edit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 27. product_add_requests ─────────────────────────────────
ALTER TABLE product_add_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "add_requests: own read"
  ON product_add_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "add_requests: own insert"
  ON product_add_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 28. verify_requests ──────────────────────────────────────
ALTER TABLE verify_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verify_requests: own read"
  ON verify_requests FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verify_requests: own insert"
  ON verify_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 29. verify_email_otps ────────────────────────────────────
ALTER TABLE verify_email_otps ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = service_role만 접근

-- ── 30. twitter_log ──────────────────────────────────────────
ALTER TABLE twitter_log ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = service_role만 접근

-- ── 31. community_post_downvotes ─────────────────────────────
-- (API에서 참조되므로 존재하는 경우)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_post_downvotes') THEN
    ALTER TABLE community_post_downvotes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
