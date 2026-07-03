-- ============================================================
-- migration_laptop_gpu_benchmarks.sql
-- 랩탑 CPU 추가 벤치마크 및 GPU ML 점수 컬럼 추가
--
-- 실행 방법: Supabase SQL Editor에 붙여넣고 실행
-- ============================================================


-- ============================================================
-- STEP 1. cpus 테이블 — 새 컬럼 추가
-- ============================================================
alter table cpus
  add column if not exists passmark_single integer,      -- Passmark CPU Single-Thread (랩탑/데스크탑)
  add column if not exists passmark_multi  integer,      -- Passmark CPU Multi-Thread  (랩탑/데스크탑)
  add column if not exists tdp             integer,      -- TDP (W) — 랩탑/데스크탑
  add column if not exists process_nm      integer,      -- 제조 공정 (nm, 선택)
  add column if not exists gpu_id          uuid references gpus(id) on delete set null;  -- 연동 GPU


-- ============================================================
-- STEP 2. gpus 테이블 — ML 벤치마크 컬럼 추가
-- ============================================================
alter table gpus
  add column if not exists gb6_ml_single    numeric,     -- Geekbench ML Single Precision
  add column if not exists gb6_ml_half      numeric,     -- Geekbench ML Half Precision
  add column if not exists gb6_ml_quantized numeric;     -- Geekbench ML Quantized


-- ============================================================
-- STEP 3. 랩탑/데스크탑 CPU relative_score 재계산 함수 갱신
--   공식: CB Single 20% · CB Multi 25% · GB6 Single 15% · GB6 Multi 20%
--         Passmark Single 10% · Passmark Multi 10%
--   없는 항목은 그 가중치가 나머지에 비례 재배분
-- ============================================================
create or replace function recalc_cpu_relative_scores()
returns void
language plpgsql as $$
declare
  -- 모바일 최댓값
  max_gb6s   numeric;
  max_gb6m   numeric;
  max_tdmk   numeric;
  max_antu   numeric;
  -- 랩탑/데스크탑 최댓값
  max_cbs    numeric;
  max_cbm    numeric;
  max_gb6ls  numeric;
  max_gb6lm  numeric;
  max_pms    numeric;
  max_pmm    numeric;
begin
  -- ── 모바일 최댓값 ──
  select max(gb6_single)   into max_gb6s from cpus where gb6_single   is not null and type = 'mobile';
  select max(gb6_multi)    into max_gb6m from cpus where gb6_multi    is not null and type = 'mobile';
  select max(tdmark_score) into max_tdmk from cpus where tdmark_score is not null and type = 'mobile';
  select max(antutu_score) into max_antu from cpus where antutu_score is not null and type = 'mobile';

  -- ── 랩탑/데스크탑 최댓값 ──
  select max(cinebench_single) into max_cbs  from cpus where cinebench_single is not null and type in ('laptop','desktop');
  select max(cinebench_multi)  into max_cbm  from cpus where cinebench_multi  is not null and type in ('laptop','desktop');
  select max(gb6_single)       into max_gb6ls from cpus where gb6_single      is not null and type in ('laptop','desktop');
  select max(gb6_multi)        into max_gb6lm from cpus where gb6_multi       is not null and type in ('laptop','desktop');
  select max(passmark_single)  into max_pms  from cpus where passmark_single  is not null and type in ('laptop','desktop');
  select max(passmark_multi)   into max_pmm  from cpus where passmark_multi   is not null and type in ('laptop','desktop');

  -- ── 모바일: GB6 Single 25% + GB6 Multi 25% + 3DMark 25% + AnTuTu 25% ──
  update cpus
     set relative_score = round((
           coalesce(gb6_single::numeric   / nullif(max_gb6s, 0), 0) * 0.25
         + coalesce(gb6_multi::numeric    / nullif(max_gb6m, 0), 0) * 0.25
         + coalesce(tdmark_score::numeric / nullif(max_tdmk, 0), 0) * 0.25
         + coalesce(antutu_score::numeric / nullif(max_antu, 0), 0) * 0.25
         ) * 1000, 1)
   where type = 'mobile';

  -- ── 랩탑/데스크탑: CB Single 20% · CB Multi 25% · GB6S 15% · GB6M 20% · PMS 10% · PMM 10% ──
  -- 없는 항목은 해당 비율 제외 후 나머지 합산으로 나눔
  update cpus
     set relative_score = round(
           case
             when (cinebench_single is null and cinebench_multi is null and
                   gb6_single is null and gb6_multi is null and
                   passmark_single is null and passmark_multi is null)
               then null
             else (
               coalesce(cinebench_single::numeric / nullif(max_cbs,  0), 0) * 0.20
             + coalesce(cinebench_multi::numeric  / nullif(max_cbm,  0), 0) * 0.25
             + coalesce(gb6_single::numeric       / nullif(max_gb6ls,0), 0) * 0.15
             + coalesce(gb6_multi::numeric        / nullif(max_gb6lm,0), 0) * 0.20
             + coalesce(passmark_single::numeric  / nullif(max_pms,  0), 0) * 0.10
             + coalesce(passmark_multi::numeric   / nullif(max_pmm,  0), 0) * 0.10
             ) / nullif(
               case when cinebench_single is not null then 0.20 else 0 end
             + case when cinebench_multi  is not null then 0.25 else 0 end
             + case when gb6_single       is not null then 0.15 else 0 end
             + case when gb6_multi        is not null then 0.20 else 0 end
             + case when passmark_single  is not null then 0.10 else 0 end
             + case when passmark_multi   is not null then 0.10 else 0 end
             , 0) * 1000
           end
         , 1)
   where type in ('laptop', 'desktop');
end;
$$;


-- ============================================================
-- STEP 4. 트리거 — 새 필드 포함하여 재등록
-- ============================================================
drop trigger if exists trg_cpu_score_recalc on cpus;
create trigger trg_cpu_score_recalc
  after insert or update of
    gb6_single, gb6_multi,
    cinebench_single, cinebench_multi,
    passmark_single, passmark_multi
  on cpus
  for each statement
  execute function _trigger_recalc_cpu();


-- ============================================================
-- STEP 5. 인덱스
-- ============================================================
create index if not exists idx_cpus_gpu_id on cpus(gpu_id);
