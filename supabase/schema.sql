-- MEMORY SEOUL 스키마. Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 Run.
-- 모든 접근은 Next.js 서버(API 라우트)가 service_role 키로 함 → 테이블은 RLS만 켜고 정책 없음(브라우저 직접 접근 차단).

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,           -- 기기 식별. 가입한 사용자는 서버가 만든 로그인 토큰(uuid)이 들어감
  email text unique,                        -- 가입한 사용자만 (소문자로 저장)
  password_hash text,                       -- salt(hex):scrypt(hex). 응답·로그에 절대 노출 금지
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
  record_type text,                                -- wish | retro | letter
  fortune text,                                    -- 운 카테고리 (주)
  target text,                                     -- self | partner | family | friend | faraway
  ai_card jsonb not null default '{}',             -- 카드 디자인 값·각인 문구
  unlock_type text not null default 'revisit' check (unlock_type in ('date', 'season', 'revisit', 'together')),
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

-- 장소 추가·정리 (2026-11-06): 경복궁 추가, 시연 장소 이름을 명지대학교로
insert into places (slug, name_ko, name_en, lat, lng, radius_m, description) values
  ('gyeongbokgung', '경복궁', 'Gyeongbokgung Palace', 37.5788408, 126.9770162, 300,
   '조선의 법궁. 붉은 기둥과 단청을 칠한 목조 전각, 기와지붕, 넓은 박석 마당, 근정전과 경회루(연못 위 누각), 뒤로 북악산이 보인다. 한복을 입은 관람객이 많다.')
on conflict (slug) do nothing;
update places set name_ko = '명지대학교', name_en = 'Myongji University' where slug = 'demo-hall';
-- 안산 자락길 제외, 독립문 추가
delete from places where slug = 'ansan-jarakgil' and not exists (select 1 from memories m where m.place_id = places.id);
insert into places (slug, name_ko, name_en, lat, lng, radius_m, description) values
  ('dongnimmun', '독립문', 'Independence Gate', 37.5718896, 126.9589747, 250,
   '서대문독립공원 안의 화강암 석조 문. 개선문처럼 가운데 아치가 뚫려 있고 위에 "독립문" 글씨가 새겨져 있다. 주변에 넓은 광장과 나무, 근처에 붉은 벽돌의 서대문형무소역사관이 있다.')
on conflict (slug) do nothing;
-- 고리 15종의 장소 13곳 (좌표: 네이버 Geocoding, 2026-11-06)
insert into places (slug, name_ko, name_en, lat, lng, radius_m, description) values
  ('ansan-beacon', '안산 봉수대', 'Ansan Beacon Fire Station', 37.5756153, 126.9462351, 150, '안산 정상의 무악 동봉수대. 위쪽이 좁아지는 높은 석축, 돌 단과 사각 아궁이, 서울 도심이 내려다보인다.'),
  ('craft-museum', '서울공예박물관', 'Seoul Museum of Craft Art', 37.5766474, 126.983379, 150, '옛 풍문여고 자리의 공예박물관. 붉은 벽돌 건물 여러 동과 마당, 보자기·조각보 등 공예품 전시가 있다.'),
  ('eunpyeong-hanok', '은평역사한옥박물관', 'Eunpyeong History Hanok Museum', 37.6403454, 126.938022, 200, '은평한옥마을 안의 박물관. 기와지붕 한옥들과 북한산 능선, 야외 기와가마터가 보인다.'),
  ('jingwansa', '진관사 칠성각', 'Jingwansa Temple Chilseonggak', 37.6379923, 126.9466776, 250, '북한산 자락의 사찰 진관사. 단청을 칠한 전각과 기와지붕, 녹색 문의 칠성각, 계곡과 숲이 보인다.'),
  ('money-museum', '한국은행 화폐박물관', 'Bank of Korea Money Museum', 37.5620607, 126.9805214, 150, '옛 조선은행 본관의 석조 건물. 화강암 외벽, 돔 지붕, 아치형 창이 있는 르네상스풍 건물이고 안에 금고 모형과 화폐 전시가 있다.'),
  ('myeongdong-theater', '명동예술극장', 'Myeongdong Theater', 37.5640461, 126.9842201, 150, '명동 거리의 옛 극장 건물. 모서리가 둥근 외관에 아치형 창이 줄지어 있고 극장 간판이 있다.'),
  ('oil-tank-t4', '문화비축기지', 'Oil Tank Culture Park', 37.5703467, 126.8950314, 300, '옛 석유비축기지를 바꾼 공원. 커다란 원통형 탱크, 돌출된 콘크리트 입구, 기둥과 줄무늬 셔터, 넓은 마당과 매봉산 절벽이 보인다.'),
  ('pinson-hall', '연세대 핀슨관', 'Pinson Hall, Yonsei University', 37.5671131, 126.9390292, 300, '연세대 캠퍼스의 핀슨관(윤동주기념관). 담쟁이가 덮인 오래된 석조 건물과 뾰족한 지붕, 캠퍼스 숲길이 보인다.'),
  ('sdm-natural-history', '서대문자연사박물관', 'Seodaemun Museum of Natural History', 37.5767601, 126.9378746, 150, '안산 자락의 자연사박물관. 중앙홀에 긴 두개골과 높이 솟은 등뼈의 대형 공룡(아크로칸토사우루스) 골격이 서 있다.'),
  ('seodaemun-prison', '서대문형무소역사관', 'Seodaemun Prison History Hall', 37.5718896, 126.9589747, 200, '붉은 벽돌의 옛 형무소 건물. 높은 담장과 망루, 붉은 벽돌 옥사가 줄지어 있다.'),
  ('seoul-battleship', '서울함공원', 'Seoul Battleship Park', 37.5557956, 126.8939668, 250, '한강변에 정박한 회색 퇴역 군함과 잠수정 전시 공원. 회색 선체, 함포, 전시용 잠망경, 한강과 다리가 보인다.'),
  ('sinchon-station', '구 신촌역사', 'Old Sinchon Station', 37.5598242, 126.942387, 150, '경의선 신촌역의 옛 역사. 작은 단층 목조 역 건물로 박공지붕과 처마가 있고, 옆에 큰 현대식 민자역사 건물과 철길이 있다.'),
  ('sori-museum', '서울우리소리박물관', 'Seoul Museum of Korean Traditional Music', 37.5771703, 126.9896012, 150, '창덕궁 앞 우리소리박물관. 낮은 현대식 건물과 민요·소리 아카이브 전시, 카세트테이프와 음향 기기 전시가 있다.')
on conflict (slug) do nothing;
