-- profiles 테이블에 국가/언어/통화 컬럼 추가
alter table profiles add column if not exists country  text default null;
alter table profiles add column if not exists locale   text default null;
alter table profiles add column if not exists currency text default null;
