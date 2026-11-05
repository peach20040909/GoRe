-- 기획서 6장(기억 카드)·7장(다음 계절에 열림) 반영. schema.sql을 이미 실행한 DB에 SQL Editor로 한 번 실행.
alter table memories add column if not exists record_type text;     -- wish | retro | letter
alter table memories add column if not exists fortune text;         -- 운 카테고리 (주)
alter table memories add column if not exists target text;          -- self | partner | family | friend | faraway
alter table memories add column if not exists ai_card jsonb not null default '{}';
  -- {"color","shape","pattern","glow","engraving":{"mine","ko"},"fortuneSub","timeHint"}

alter table memories drop constraint if exists memories_unlock_type_check;
alter table memories add constraint memories_unlock_type_check
  check (unlock_type in ('date', 'season', 'revisit', 'together'));
