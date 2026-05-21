-- comparison_verdicts: 제품 쌍별 누적 AI 판정 저장
-- pair_key = 두 product UUID를 정렬 후 ':' 로 연결 (e.g. "aaa:bbb")

CREATE TABLE IF NOT EXISTS comparison_verdicts (
  pair_key         text        PRIMARY KEY,
  product_ids      uuid[]      NOT NULL,
  winner_name      text,
  summary          text,
  comparison_count integer     NOT NULL DEFAULT 1,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 홈 트렌딩 API에서 pair_key 배열로 일괄 조회
CREATE INDEX IF NOT EXISTS idx_comparison_verdicts_pair_key ON comparison_verdicts (pair_key);

-- 비교 발생 시 verdict upsert: 첫 번째면 INSERT, 이후엔 count 증가 + summary 갱신
CREATE OR REPLACE FUNCTION upsert_comparison_verdict(
  p_pair_key    text,
  p_product_ids uuid[],
  p_winner_name text,
  p_summary     text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO comparison_verdicts (pair_key, product_ids, winner_name, summary, comparison_count, updated_at)
  VALUES (p_pair_key, p_product_ids, p_winner_name, p_summary, 1, now())
  ON CONFLICT (pair_key) DO UPDATE
    SET comparison_count = comparison_verdicts.comparison_count + 1,
        winner_name      = COALESCE(p_winner_name, comparison_verdicts.winner_name),
        summary          = COALESCE(p_summary,     comparison_verdicts.summary),
        updated_at       = now();
END;
$$;
