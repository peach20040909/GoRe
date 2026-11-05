-- docs/API.md 9장(회원가입·로그인). schema.sql을 이미 실행한 DB에 SQL Editor로 한 번 실행.
alter table users add column if not exists email text unique;
alter table users add column if not exists password_hash text;
