-- migration_price_numeric.sql
-- price_usd 컬럼 타입을 integer → numeric 으로 변경
-- Supabase SQL Editor 에서 실행하세요

ALTER TABLE products
  ALTER COLUMN price_usd TYPE numeric USING price_usd::numeric;
