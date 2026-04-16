-- ============================================================
-- PICKVOLT 포인트 시스템 마이그레이션
-- ============================================================

-- 1. profiles 테이블에 포인트 관련 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_bonus_at TIMESTAMPTZ;

-- 2. 포인트 내역 테이블
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       INTEGER     NOT NULL,   -- 양수: 획득, 음수: 소비
  reason       TEXT        NOT NULL,   -- 'signup_bonus' | 'daily_login' | 'ai_comparison'
  reference_id TEXT,                   -- comparison_history id 등
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.point_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. AI 비교 포인트 차감 함수 (원자적)
--    호출 유저의 포인트를 1 차감.
--    성공 시 차감 후 잔여 포인트 반환, 포인트 부족 시 NULL 반환.
CREATE OR REPLACE FUNCTION public.use_ai_point()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_points INTEGER;
BEGIN
  UPDATE public.profiles
  SET points = points - 1
  WHERE user_id = auth.uid() AND points >= 1
  RETURNING points INTO new_points;

  IF new_points IS NOT NULL THEN
    INSERT INTO public.point_transactions (user_id, amount, reason)
    VALUES (auth.uid(), -1, 'ai_comparison');
  END IF;

  RETURN new_points;  -- NULL이면 포인트 부족
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_ai_point() TO authenticated;

-- 4. 일일 로그인 보너스 수령 함수 (원자적)
--    오늘 아직 수령하지 않은 경우에만 +5 포인트.
--    (claimed=true, new_points) 또는 (claimed=false, current_points) 반환.
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS TABLE(claimed BOOLEAN, new_points INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_points INTEGER;
BEGIN
  UPDATE public.profiles
  SET points               = points + 5,
      last_login_bonus_at  = NOW()
  WHERE user_id = auth.uid()
    AND (last_login_bonus_at IS NULL
         OR last_login_bonus_at::date < CURRENT_DATE)
  RETURNING points INTO updated_points;

  IF updated_points IS NOT NULL THEN
    INSERT INTO public.point_transactions (user_id, amount, reason)
    VALUES (auth.uid(), 5, 'daily_login');

    RETURN QUERY SELECT TRUE, updated_points;
  ELSE
    RETURN QUERY
      SELECT FALSE,
             COALESCE(
               (SELECT points FROM public.profiles WHERE user_id = auth.uid()),
               0
             );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_bonus() TO authenticated;
