-- ============================================================
-- migration_cpu_score_rebalance.sql
-- CPU relative_score 가중치 재조정
--
-- 기존: CB(45%) · GB6(35%) · Passmark(20%)  — 불균형
-- 변경: CB(33%) · GB6(33%) · Passmark(34%)  — 세 벤치마크 균등
--       Single 35% · Multi 65%  — 멀티코어 비중 강화
--
--   CB Single 11% · CB Multi 22%
--   GB6 Single 11% · GB6 Multi 22%
--   PM Single 13% · PM Multi 21%
--
-- 없는 항목의 가중치는 나머지에 비례 재배분
-- 실행: Supabase SQL Editor에 붙여넣고 실행
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
  select max(cinebench_single) into max_cbs   from cpus where cinebench_single is not null and type in ('laptop','desktop');
  select max(cinebench_multi)  into max_cbm   from cpus where cinebench_multi  is not null and type in ('laptop','desktop');
  select max(gb6_single)       into max_gb6ls from cpus where gb6_single       is not null and type in ('laptop','desktop');
  select max(gb6_multi)        into max_gb6lm from cpus where gb6_multi        is not null and type in ('laptop','desktop');
  select max(passmark_single)  into max_pms   from cpus where passmark_single  is not null and type in ('laptop','desktop');
  select max(passmark_multi)   into max_pmm   from cpus where passmark_multi   is not null and type in ('laptop','desktop');

  -- ── 모바일: GB6 Single 25% + GB6 Multi 25% + 3DMark 25% + AnTuTu 25% (기존 유지) ──
  update cpus
     set relative_score = round((
           coalesce(gb6_single::numeric   / nullif(max_gb6s, 0), 0) * 0.25
         + coalesce(gb6_multi::numeric    / nullif(max_gb6m, 0), 0) * 0.25
         + coalesce(tdmark_score::numeric / nullif(max_tdmk, 0), 0) * 0.25
         + coalesce(antutu_score::numeric / nullif(max_antu, 0), 0) * 0.25
         ) * 1000, 1)
   where type = 'mobile';

  -- ── 랩탑/데스크탑 ──
  -- CB Single 11% · CB Multi 22% · GB6 Single 11% · GB6 Multi 22%
  -- PM Single 13% · PM Multi 21%  (Single 35% · Multi 65%)
  -- 없는 항목은 해당 비율 제외 후 나머지 합산으로 나눔 (비례 재배분)
  update cpus
     set relative_score = round(
           case
             when (cinebench_single is null and cinebench_multi is null and
                   gb6_single is null and gb6_multi is null and
                   passmark_single is null and passmark_multi is null)
               then null
             else (
               coalesce(cinebench_single::numeric / nullif(max_cbs,   0), 0) * 0.11
             + coalesce(cinebench_multi::numeric  / nullif(max_cbm,   0), 0) * 0.22
             + coalesce(gb6_single::numeric       / nullif(max_gb6ls, 0), 0) * 0.11
             + coalesce(gb6_multi::numeric        / nullif(max_gb6lm, 0), 0) * 0.22
             + coalesce(passmark_single::numeric  / nullif(max_pms,   0), 0) * 0.13
             + coalesce(passmark_multi::numeric   / nullif(max_pmm,   0), 0) * 0.21
             ) / nullif(
               case when cinebench_single is not null then 0.11 else 0 end
             + case when cinebench_multi  is not null then 0.22 else 0 end
             + case when gb6_single       is not null then 0.11 else 0 end
             + case when gb6_multi        is not null then 0.22 else 0 end
             + case when passmark_single  is not null then 0.13 else 0 end
             + case when passmark_multi   is not null then 0.21 else 0 end
             , 0) * 1000
           end
         , 1)
   where type in ('laptop', 'desktop');
end;
$$;


-- 즉시 재계산 실행
select recalc_cpu_relative_scores();
