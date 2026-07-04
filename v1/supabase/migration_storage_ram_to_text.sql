-- ============================================================
-- migration_storage_ram_to_text.sql
-- storage_gb, ram_gb 컬럼을 numeric → text로 변경
-- 여러 옵션 저장 가능 (예: "256, 512, 1024" / "8, 16, 32")
-- Supabase SQL Editor에서 실행
-- ============================================================

ALTER TABLE specs_common
  ALTER COLUMN storage_gb TYPE text USING storage_gb::text,
  ALTER COLUMN ram_gb     TYPE text USING ram_gb::text;
