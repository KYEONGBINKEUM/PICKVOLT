-- ============================================================
-- RLS 전체 보안 패치 v2 (컬럼명 오류 수정)
-- 이전 migration_rls_fix.sql 실행 후 오류 난 경우 이걸 실행
-- 이미 적용된 테이블은 IF NOT EXISTS로 중복 방지
-- ============================================================

-- ── 1. products ──────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='products: public read') THEN
    CREATE POLICY "products: public read" ON products FOR SELECT USING (true);
  END IF;
END $$;

-- ── 2. product_variants ──────────────────────────────────────
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_variants' AND policyname='product_variants: public read') THEN
    CREATE POLICY "product_variants: public read" ON product_variants FOR SELECT USING (true);
  END IF;
END $$;

-- ── 3. cpus ──────────────────────────────────────────────────
ALTER TABLE cpus ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cpus' AND policyname='cpus: public read') THEN
    CREATE POLICY "cpus: public read" ON cpus FOR SELECT USING (true);
  END IF;
END $$;

-- ── 4. gpus ──────────────────────────────────────────────────
ALTER TABLE gpus ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gpus' AND policyname='gpus: public read') THEN
    CREATE POLICY "gpus: public read" ON gpus FOR SELECT USING (true);
  END IF;
END $$;

-- ── 5. specs_common ──────────────────────────────────────────
ALTER TABLE specs_common ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_common' AND policyname='specs_common: public read') THEN
    CREATE POLICY "specs_common: public read" ON specs_common FOR SELECT USING (true);
  END IF;
END $$;

-- ── 6. specs_laptop ──────────────────────────────────────────
ALTER TABLE specs_laptop ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_laptop' AND policyname='specs_laptop: public read') THEN
    CREATE POLICY "specs_laptop: public read" ON specs_laptop FOR SELECT USING (true);
  END IF;
END $$;

-- ── 7. specs_smartphone ──────────────────────────────────────
ALTER TABLE specs_smartphone ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_smartphone' AND policyname='specs_smartphone: public read') THEN
    CREATE POLICY "specs_smartphone: public read" ON specs_smartphone FOR SELECT USING (true);
  END IF;
END $$;

-- ── 8. specs_tablet ──────────────────────────────────────────
ALTER TABLE specs_tablet ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_tablet' AND policyname='specs_tablet: public read') THEN
    CREATE POLICY "specs_tablet: public read" ON specs_tablet FOR SELECT USING (true);
  END IF;
END $$;

-- ── 9. specs_smartwatch ──────────────────────────────────────
ALTER TABLE specs_smartwatch ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_smartwatch' AND policyname='specs_smartwatch: public read') THEN
    CREATE POLICY "specs_smartwatch: public read" ON specs_smartwatch FOR SELECT USING (true);
  END IF;
END $$;

-- ── 10. specs_monitor ────────────────────────────────────────
ALTER TABLE specs_monitor ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='specs_monitor' AND policyname='specs_monitor: public read') THEN
    CREATE POLICY "specs_monitor: public read" ON specs_monitor FOR SELECT USING (true);
  END IF;
END $$;

-- ── 11. tech_events ──────────────────────────────────────────
ALTER TABLE tech_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tech_events' AND policyname='tech_events: public read approved') THEN
    CREATE POLICY "tech_events: public read approved" ON tech_events FOR SELECT USING (is_approved = true);
  END IF;
END $$;

-- ── 12. comparison_verdicts ──────────────────────────────────
ALTER TABLE comparison_verdicts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comparison_verdicts' AND policyname='comparison_verdicts: public read') THEN
    CREATE POLICY "comparison_verdicts: public read" ON comparison_verdicts FOR SELECT USING (true);
  END IF;
END $$;

-- ── 13. profiles ─────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles: public read') THEN
    CREATE POLICY "profiles: public read" ON profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='profiles: own update') THEN
    CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 14. reviews ──────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='reviews: public read') THEN
    CREATE POLICY "reviews: public read" ON reviews FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='reviews: own insert') THEN
    CREATE POLICY "reviews: own insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='reviews: own update') THEN
    CREATE POLICY "reviews: own update" ON reviews FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reviews' AND policyname='reviews: own delete') THEN
    CREATE POLICY "reviews: own delete" ON reviews FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 15. review_likes (fingerprint 기반, user_id 없음) ────────
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_likes' AND policyname='review_likes: public read') THEN
    CREATE POLICY "review_likes: public read" ON review_likes FOR SELECT USING (true);
  END IF;
  -- insert/delete는 service_role이 처리 (fingerprint 기반이라 RLS 불가)
END $$;

-- ── 16. wishlists ────────────────────────────────────────────
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wishlists' AND policyname='wishlists: own read') THEN
    CREATE POLICY "wishlists: own read" ON wishlists FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wishlists' AND policyname='wishlists: own insert') THEN
    CREATE POLICY "wishlists: own insert" ON wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wishlists' AND policyname='wishlists: own delete') THEN
    CREATE POLICY "wishlists: own delete" ON wishlists FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 17. community_comment_downvotes ──────────────────────────
ALTER TABLE community_comment_downvotes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comment_downvotes' AND policyname='comment_downvotes: public read') THEN
    CREATE POLICY "comment_downvotes: public read" ON community_comment_downvotes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comment_downvotes' AND policyname='comment_downvotes: own insert') THEN
    CREATE POLICY "comment_downvotes: own insert" ON community_comment_downvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_comment_downvotes' AND policyname='comment_downvotes: own delete') THEN
    CREATE POLICY "comment_downvotes: own delete" ON community_comment_downvotes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 18. community_post_unlocks ───────────────────────────────
ALTER TABLE community_post_unlocks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_post_unlocks' AND policyname='post_unlocks: own read') THEN
    CREATE POLICY "post_unlocks: own read" ON community_post_unlocks FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 19. community_post_downvotes (존재하는 경우) ─────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='community_post_downvotes') THEN
    EXECUTE 'ALTER TABLE community_post_downvotes ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_post_downvotes' AND policyname='post_downvotes: public read') THEN
      EXECUTE 'CREATE POLICY "post_downvotes: public read" ON community_post_downvotes FOR SELECT USING (true)';
    END IF;
  END IF;
END $$;

-- ── 20. community_reports ────────────────────────────────────
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_reports' AND policyname='community_reports: own read') THEN
    CREATE POLICY "community_reports: own read" ON community_reports FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='community_reports' AND policyname='community_reports: own insert') THEN
    CREATE POLICY "community_reports: own insert" ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
END $$;

-- ── 21. notifications ────────────────────────────────────────
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications: own read') THEN
    CREATE POLICY "notifications: own read" ON notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notifications: own update') THEN
    CREATE POLICY "notifications: own update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 22. clans ────────────────────────────────────────────────
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clans' AND policyname='clans: public read') THEN
    CREATE POLICY "clans: public read" ON clans FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clans' AND policyname='clans: owner update') THEN
    CREATE POLICY "clans: owner update" ON clans FOR UPDATE USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clans' AND policyname='clans: owner delete') THEN
    CREATE POLICY "clans: owner delete" ON clans FOR DELETE USING (auth.uid() = owner_id);
  END IF;
END $$;

-- ── 23. clan_members ─────────────────────────────────────────
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clan_members' AND policyname='clan_members: public read') THEN
    CREATE POLICY "clan_members: public read" ON clan_members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clan_members' AND policyname='clan_members: own insert') THEN
    CREATE POLICY "clan_members: own insert" ON clan_members FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clan_members' AND policyname='clan_members: own delete') THEN
    CREATE POLICY "clan_members: own delete" ON clan_members FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 24. newsletter_subscribers (service_role 전용) ────────────
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
-- 정책 없음 = anon/authenticated 직접 접근 불가, service_role만 접근

-- ── 25. app_settings ─────────────────────────────────────────
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='app_settings: public read') THEN
    CREATE POLICY "app_settings: public read" ON app_settings FOR SELECT USING (true);
  END IF;
END $$;

-- ── 26. contact_inquiries (user_id 컬럼 없음 — 이메일 기반) ──
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
-- service_role만 읽기/수정 가능 (관리자 API가 service_role 사용)

-- ── 27. product_edit_requests ────────────────────────────────
ALTER TABLE product_edit_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_edit_requests' AND policyname='edit_requests: own read') THEN
    CREATE POLICY "edit_requests: own read" ON product_edit_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_edit_requests' AND policyname='edit_requests: own insert') THEN
    CREATE POLICY "edit_requests: own insert" ON product_edit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 28. product_add_requests ─────────────────────────────────
ALTER TABLE product_add_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_add_requests' AND policyname='add_requests: own read') THEN
    -- user_id가 null일 수도 있으므로 (비로그인 요청) 본인 or null 허용
    CREATE POLICY "add_requests: own read" ON product_add_requests FOR SELECT
      USING (user_id IS NULL OR auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_add_requests' AND policyname='add_requests: insert') THEN
    CREATE POLICY "add_requests: insert" ON product_add_requests FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ── 29. verify_requests ──────────────────────────────────────
ALTER TABLE verify_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verify_requests' AND policyname='verify_requests: own read') THEN
    CREATE POLICY "verify_requests: own read" ON verify_requests FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='verify_requests' AND policyname='verify_requests: own insert') THEN
    CREATE POLICY "verify_requests: own insert" ON verify_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 30. verify_email_otps (service_role 전용) ─────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='verify_email_otps') THEN
    EXECUTE 'ALTER TABLE verify_email_otps ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- ── 31. twitter_log (service_role 전용) ──────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='twitter_log') THEN
    EXECUTE 'ALTER TABLE twitter_log ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
