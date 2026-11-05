-- MEMORY SEOUL 스키마. Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 Run.
-- 모든 접근은 Next.js 서버(API 라우트)가 service_role 키로 함 → 테이블은 RLS만 켜고 정책 없음(브라우저 직접 접근 차단).

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,           -- 로그인 없이 기기 식별
  nickname text,
  language text not null default 'ko',
  created_at timestamptz not null default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_ko text not null,
  name_en text not null,
  lat double precision,                     -- /admin 에서 현재 위치로 저장
  lng double precision,
  radius_m int not null default 150,        -- 자동 입장 반경
  description text not null,                -- AI 장소 판정용 특징 설명
  created_at timestamptz not null default now()
);

create table place_photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references places(id) on delete cascade,
  photo_url text not null                   -- AI 판정 기준 사진
);

create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  place_id uuid not null references places(id),
  parent_memory_id uuid references memories(id),   -- 새 기억 한 겹 더
  medium text not null default 'lock',             -- 매개체
  content text not null,                           -- 원문, 본인만
  photo_url text,                                  -- 잠글 때 찍은 사진
  language text not null default 'ko',
  ai_title text,
  ai_keywords text[] not null default '{}',
  ai_emotion text,
  visibility text not null default 'private' check (visibility in ('private', 'public_anonymous')),
  unlock_type text not null default 'revisit' check (unlock_type in ('date', 'revisit', 'together')),
  unlock_at timestamptz,
  unlock_note text,                                -- AI가 제안한 조건 설명
  status text not null default 'locked' check (status in ('locked', 'opened')),
  created_at timestamptz not null default now(),
  opened_at timestamptz
);
create index on memories (user_id);
create index on memories (place_id);

create table public_memories (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid unique not null references memories(id) on delete cascade,
  place_id uuid not null references places(id),
  anon_text text not null,                  -- 익명화된 공개본
  translations jsonb not null default '{}', -- {"en": "...", "ja": "..."}
  hidden boolean not null default false,    -- 신고·관리용
  created_at timestamptz not null default now()
);
create index on public_memories (place_id, created_at desc);

create table revisits (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  photo_url text,
  lat double precision,
  lng double precision,
  same_spot boolean not null,               -- AI 판정
  confidence real,
  reason text,
  reunion_report text,                      -- AI 재회 리포트
  created_at timestamptz not null default now()
);
create index on revisits (memory_id);

alter table users enable row level security;
alter table places enable row level security;
alter table place_photos enable row level security;
alter table memories enable row level security;
alter table public_memories enable row level security;
alter table revisits enable row level security;

-- 사진 저장소: 공개 읽기 버킷 (업로드는 서버가 service_role로)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 장소 시드. 좌표는 비워두고 현장에서 /admin 의 "현재 위치로 저장"으로 채움
insert into places (slug, name_ko, name_en, description) values
  ('hongje-falls', '홍제폭포', 'Hongje Falls',
   '홍제천의 인공 암벽 폭포. 넓은 바위 절벽에서 물줄기가 여러 갈래로 떨어지고, 앞에 하천 산책로와 징검다리, 옆에 큰 유리창의 카페(카페폭포)와 복합문화센터가 있다. 겨울에는 얼어붙는다.'),
  ('ansan-jarakgil', '안산 자락길', 'Ansan Jarak-gil Trail',
   '서대문구 안산을 도는 무장애 숲길. 나무 데크 산책로와 난간, 벚나무와 메타세쿼이아 숲, 도심이 내려다보이는 전망대가 있다.'),
  ('demo-hall', '발표장', 'Demo Hall',
   '명지대학교 인문캠퍼스 강의실. 칠판, 프로젝터 스크린, 강의용 책상과 의자가 있다. 시연용 장소.');
