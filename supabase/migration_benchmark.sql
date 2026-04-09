-- ============================================================
-- migration_benchmark.sql
-- PassMark → Geekbench 6 기반 벤치마크 컬럼 마이그레이션
--
-- 실행 순서:
--   1. Supabase SQL Editor 에 붙여넣고 실행
--   2. chip_seeder.py 실행 (데이터 시딩)
-- ============================================================


-- ============================================================
-- STEP 1. cpus 테이블이 없으면 생성
-- ============================================================
create table if not exists cpus (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique,
  brand text not null
);

-- ============================================================
-- STEP 2. gpus 테이블이 없으면 생성
-- ============================================================
create table if not exists gpus (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique,
  brand text not null
);


-- ============================================================
-- STEP 3. 새 컬럼 추가 — cpus
-- ============================================================
alter table cpus
  add column if not exists gb6_single     integer,      -- Geekbench 6 Single-Core
  add column if not exists gb6_multi      integer,      -- Geekbench 6 Multi-Core
  add column if not exists score_source   text default 'geekbench6',
  add column if not exists relative_score numeric;      -- (gb6_multi / max) * 1000


-- ============================================================
-- STEP 4. 새 컬럼 추가 — gpus
-- ============================================================
alter table gpus
  add column if not exists gb6_single     integer,      -- GB6 Compute (Metal/Vulkan/CUDA)
  add column if not exists gb6_multi      integer,      -- GB6 Compute 종합
  add column if not exists score_source   text default 'geekbench6',
  add column if not exists relative_score numeric;


-- ============================================================
-- STEP 5. 상대 점수 재계산 함수 — cpus
--   공식: (GB6 Single 33% + GB6 Multi 33% + iGPU 33%) 균등 합산
--         각 항목은 DB 내 최댓값으로 정규화(0–1) 후 가중치 적용 → × 1000
-- ============================================================
create or replace function recalc_cpu_relative_scores()
returns void
language plpgsql as $$
declare
  max_single numeric;
  max_multi  numeric;
  max_igpu   numeric;
begin
  select max(gb6_single)      into max_single from cpus where gb6_single      is not null;
  select max(gb6_multi)       into max_multi  from cpus where gb6_multi        is not null;
  select max(igpu_gb6_single) into max_igpu   from cpus where igpu_gb6_single  is not null;

  update cpus
     set relative_score = round((
           coalesce(gb6_single::numeric      / nullif(max_single, 0), 0) * 0.333
         + coalesce(gb6_multi::numeric       / nullif(max_multi,  0), 0) * 0.333
         + coalesce(igpu_gb6_single::numeric / nullif(max_igpu,   0), 0) * 0.334
         ) * 1000, 1);
end;
$$;


-- ============================================================
-- STEP 6. 상대 점수 재계산 함수 — gpus
--   공식: GB6 Compute 60% + GB6 OpenCL 40%
--         각 항목은 DB 내 최댓값으로 정규화 후 가중치 적용 → × 1000
-- ============================================================
create or replace function recalc_gpu_relative_scores()
returns void
language plpgsql as $$
declare
  max_single numeric;
  max_opencl numeric;
begin
  select max(gb6_single)  into max_single from gpus where gb6_single  is not null;
  select max(gb6_opencl)  into max_opencl from gpus where gb6_opencl  is not null;

  update gpus
     set relative_score = round((
           coalesce(gb6_single::numeric / nullif(max_single, 0), 0) * 0.60
         + coalesce(gb6_opencl::numeric / nullif(max_opencl, 0), 0) * 0.40
         ) * 1000, 1);
end;
$$;


-- ============================================================
-- STEP 7. 트리거 함수 — 행 변경 시 전체 재계산
--   FOR EACH STATEMENT: 배치 upsert 도 1회만 실행
-- ============================================================
create or replace function _trigger_recalc_cpu()
returns trigger language plpgsql as $$
begin
  perform recalc_cpu_relative_scores();
  return null;
end;
$$;

create or replace function _trigger_recalc_gpu()
returns trigger language plpgsql as $$
begin
  perform recalc_gpu_relative_scores();
  return null;
end;
$$;


-- ============================================================
-- STEP 8. 트리거 등록
-- ============================================================
drop trigger if exists trg_cpu_score_recalc on cpus;
create trigger trg_cpu_score_recalc
  after insert or update of gb6_single, gb6_multi
  on cpus
  for each statement
  execute function _trigger_recalc_cpu();

drop trigger if exists trg_gpu_score_recalc on gpus;
create trigger trg_gpu_score_recalc
  after insert or update of gb6_single, gb6_multi
  on gpus
  for each statement
  execute function _trigger_recalc_gpu();


-- ============================================================
-- STEP 9. 구 PassMark 컬럼 삭제
--   (데이터 시딩 후 실행 — 아래 DROP 은 시딩 확인 뒤 따로 실행 권장)
-- ============================================================
alter table cpus
  drop column if exists passmark_score cascade,
  drop column if exists passmark_rank cascade,
  drop column if exists performance_score cascade,
  drop column if exists tier cascade;

alter table gpus
  drop column if exists passmark_score cascade,
  drop column if exists passmark_rank cascade,
  drop column if exists performance_score cascade,
  drop column if exists tier cascade;


-- ============================================================
-- STEP 10. 인덱스
-- ============================================================
create index if not exists idx_cpus_relative on cpus(relative_score desc);
create index if not exists idx_gpus_relative on gpus(relative_score desc);
create index if not exists idx_cpus_brand    on cpus(brand);
create index if not exists idx_gpus_brand    on gpus(brand);
