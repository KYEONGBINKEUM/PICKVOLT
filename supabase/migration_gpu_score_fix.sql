-- ============================================================
-- migration_gpu_score_fix.sql
-- GPU relative_score 재계산 함수 수정
--
-- 문제:
--   기존 공식 = gb6_single * 0.60 + gb6_opencl * 0.40
--   신형 GPU(Apple M5, RTX 50xx 등)는 gb6_opencl 이 NULL
--   → 최대점수가 600점에 머물고, ML 성능이 전혀 반영 안 됨
--
-- 수정 공식:
--   GB6 Compute   40%
--   ML Single     20%
--   ML Half       20%
--   ML Quantized  20%
--   (NULL 항목은 해당 가중치 제외 후 정규화 → 항상 최대 1000점)
--
-- 실행 방법: Supabase SQL Editor에 붙여넣고 실행
-- ============================================================


-- ============================================================
-- STEP 1. GPU 상대점수 재계산 함수 교체
-- ============================================================
create or replace function recalc_gpu_relative_scores()
returns void
language plpgsql as $$
declare
  max_compute   numeric;
  max_ml_single numeric;
  max_ml_half   numeric;
  max_ml_quant  numeric;
begin
  select max(gb6_single)       into max_compute   from gpus where gb6_single       is not null;
  select max(gb6_ml_single)    into max_ml_single from gpus where gb6_ml_single    is not null;
  select max(gb6_ml_half)      into max_ml_half   from gpus where gb6_ml_half      is not null;
  select max(gb6_ml_quantized) into max_ml_quant  from gpus where gb6_ml_quantized is not null;

  update gpus
     set relative_score = round(
           case
             when (gb6_single is null and gb6_ml_single is null
                   and gb6_ml_half is null and gb6_ml_quantized is null)
               then null
             else (
               coalesce(gb6_single::numeric       / nullif(max_compute,   0), 0) * 0.40
             + coalesce(gb6_ml_single::numeric    / nullif(max_ml_single, 0), 0) * 0.20
             + coalesce(gb6_ml_half::numeric      / nullif(max_ml_half,   0), 0) * 0.20
             + coalesce(gb6_ml_quantized::numeric / nullif(max_ml_quant,  0), 0) * 0.20
             ) / nullif(
               case when gb6_single       is not null then 0.40 else 0 end
             + case when gb6_ml_single    is not null then 0.20 else 0 end
             + case when gb6_ml_half      is not null then 0.20 else 0 end
             + case when gb6_ml_quantized is not null then 0.20 else 0 end
             , 0) * 1000
           end
         , 1)
   where id is not null;
end;
$$;


-- ============================================================
-- STEP 2. 트리거 — ML 컬럼 변경 시에도 재계산되도록 갱신
-- ============================================================
drop trigger if exists trg_gpu_score_recalc on gpus;
create trigger trg_gpu_score_recalc
  after insert or update of
    gb6_single,
    gb6_ml_single,
    gb6_ml_half,
    gb6_ml_quantized
  on gpus
  for each statement
  execute function _trigger_recalc_gpu();


-- ============================================================
-- STEP 3. 기존 데이터 즉시 재계산
-- ============================================================
select recalc_gpu_relative_scores();

-- 결과 확인
select name, type, gb6_single, gb6_ml_single, gb6_ml_half, gb6_ml_quantized, relative_score
  from gpus
 order by relative_score desc nulls last
 limit 20;
