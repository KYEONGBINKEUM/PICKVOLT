-- ============================================================
-- migration_igpu.sql
-- cpus 테이블에 내장 GPU 벤치마크 컬럼 추가
--
-- 실행: Supabase SQL Editor에 붙여넣고 실행
-- ============================================================

alter table cpus
  add column if not exists igpu_gb6_single integer,   -- Geekbench 6 GPU Single (Metal/Vulkan)
  add column if not exists igpu_gb6_multi  integer;   -- Geekbench 6 GPU Multi (Compute)
