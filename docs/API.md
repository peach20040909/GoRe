# 고리(Go, Re) — API 명세 (팀 분담용)

서울의 장소에 지금의 기억을 맡기고, 다시 와야 열리는 AI 기록 서비스.
DB 구조는 [`supabase/schema.sql`](../supabase/schema.sql) 참고.

## 공통 규칙

- 모든 API는 JSON in / JSON out. 실패하면 `{ "error": "사람이 읽을 메시지" }` + 4xx/5xx
- 로그인 없음. 브라우저가 `localStorage`에 만든 `deviceId`(uuid)로 사용자 구분
  - MVP 한계: deviceId만 알면 남의 기억 조회 가능. 정식 서비스에선 로그인으로 교체
- 사진은 브라우저에서 **긴 변 1280px JPEG data URL**로 줄여서 보냄 (Vercel 요청 한도 4.5MB)
- AI 호출은 `src/lib/ai.ts`의 `generate()`만 사용. 키가 없거나 실패하면 `mocked: true` → 각 API가 **시연용 예시 응답**을 돌려줘야 함 (화면이 멈추면 안 됨)
- DB 접근은 서버(API 라우트)에서만, `SUPABASE_SERVICE_ROLE_KEY`로. 브라우저에서 Supabase 직접 호출 금지

## 환경변수

| 이름 | 설명 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키 (절대 `NEXT_PUBLIC_` 붙이지 말 것) |
| `ANTHROPIC_API_KEY` | AI 키 (없으면 mock) |
| `ADMIN_KEY` | `/api/places/locate` 보호용 아무 문자열 |

## 엔드포인트 한눈에

| # | 메서드 · 경로 | AI | 우선순위 | 담당(제안) |
|---|---|---|---|---|
| 1 | `GET /api/places` | | P0 | 백엔드 |
| 2 | `POST /api/places/identify` | ✅ 장소 판정 | P0 | AI |
| 3 | `POST /api/memories/draft` | ✅ 기억 카드 + 열림 조건 제안 | P0 | AI |
| 4 | `POST /api/memories` | ✅ 익명화·번역 (공개 시) | P0 | 백엔드 + AI |
| 5 | `GET /api/memories?deviceId=` | | P0 | 백엔드 |
| 6 | `POST /api/memories/[id]/revisit` | ✅ 같은 자리 판정 + 재회 리포트 | P0 | AI |
| 7 | `GET /api/places/[slug]/layer?lang=` | | P0 | 백엔드 |
| 8 | `POST /api/places/locate` | | P1 | 백엔드 |

공통 기반(먼저 1명이 만들고 공유): `src/lib/db.ts` — Supabase REST 호출 헬퍼, 사진 업로드 함수

---

## 1. `GET /api/places` — 장소 목록

입장 화면이 GPS로 가장 가까운 장소를 찾을 때 사용. 거리 계산은 브라우저에서.

응답
```json
{ "places": [
  { "slug": "hongje-falls", "name_ko": "홍제폭포", "name_en": "Hongje Falls",
    "lat": 37.58, "lng": 126.93, "radius_m": 150 }
] }
```
- `lat`/`lng`가 아직 비어 있는 장소는 `null`로 내려줌 (GPS 자동 입장에서 제외)

## 2. `POST /api/places/identify` — 사진으로 장소 판정 (AI) ✅ 구현 완료

GPS가 애매하거나 실내일 때, 주변 사진으로 어느 장소인지 판정.

요청
```json
{ "imageDataUrl": "data:image/jpeg;base64,..." }
```
응답
```json
{ "slug": "hongje-falls", "confidence": 0.86, "reason": "인공 암벽 폭포와 옆 유리 카페가 보입니다", "mocked": false }
```
- 어느 장소도 아니면 `slug: null`
- AI 입력: 사진 + 모든 장소의 `description` (+ `place_photos` 기준 사진이 있으면 함께)
- mock: `slug: "demo-hall", confidence: 0.9`

## 3. `POST /api/memories/draft` — 기억 카드 + 열림 조건 제안 (AI, DB 저장 안 함)

사용자가 쓴 기억을 정리하고, 언제·어떻게 다시 열지 2~3개 제안.

✅ 구현 완료 (`src/app/api/memories/draft`). 기획서 6-2의 B(안전 필터)·C(기억 이해)·D(카드 디자인 값)·E(열림 조건)를 한 번에 처리.

요청 (`photoDataUrl`은 선택 — 있으면 하늘색·계절을 카드에 반영)
```json
{ "placeSlug": "hongje-falls", "language": "en", "photoDataUrl": "data:image/jpeg;base64,...",
  "content": "I came here with my girlfriend Mina. I hope we pass our exams next month and come back together." }
```
응답 (실제 응답 예)
```json
{
  "safe": true, "unsafeReason": null,
  "recordType": "retro", "fortune": { "main": null, "sub": null },
  "target": "partner", "emotion": "hopeful", "timeHint": "next month's exam",
  "title": "Memories at Hongje", "keywords": ["waterfall", "first trip", "love"],
  "card": { "color": "#87CEEB", "shape": "pair", "pattern": "waterfall", "glow": 0.7 },
  "engraving": { "mine": "Together in every season.", "ko": "모든 계절에 함께하길." },
  "unlockOptions": [
    { "type": "date", "unlockAt": "2026-12-06T00:00:00+09:00", "note": "Revisit this memory on exam day." },
    { "type": "together", "unlockAt": null, "note": "Return here with Mina." }
  ],
  "mocked": false
}
```
- 해롭거나 저주성 내용이면 **422** `{ error, reason }` → 화면에서 다시 쓰게 안내
- `recordType`: `wish`(소원) / `retro`(회고) / `letter`(편지)
- `fortune.main/sub`: `love` `wealth` `success` `health` `family` `bonds` `reunion` `fresh` `own` 또는 `null`
- `target`: `self` / `partner` / `family` / `friend` / `faraway`
- `card`: 카드 그림(SVG)에 쓰는 값. `shape`가 `pair`면 쌍자물쇠
- `unlockOptions[].type`: `date`(그날 이후) / `season`(다음 계절, `unlockAt` 있음) / `revisit`(다시 오면) / `together`(함께 와야 — MVP에선 revisit처럼 처리)
- 사람이 읽는 문장은 사용자 언어(`language`)로, `engraving.ko`만 항상 한국어

## 4. `POST /api/memories` — 기억 저장

요청
```json
{
  "deviceId": "uuid", "nickname": "민준", "language": "ko",
  "placeSlug": "hongje-falls", "medium": "lock",
  "content": "원문", "photoDataUrl": "data:image/jpeg;base64,...",
  "visibility": "public_anonymous",
  "draft": { "...": "3번 draft 응답을 그대로" },
  "unlockType": "date", "unlockAt": "2027-11-06T00:00:00+09:00", "unlockNote": "...",
  "parentMemoryId": null
}
```
draft → DB 컬럼 매핑 (`supabase/migrations/002_memory_card.sql` 실행 후)

| draft | memories 컬럼 |
|---|---|
| `title` | `ai_title` |
| `keywords` | `ai_keywords` |
| `emotion` | `ai_emotion` |
| `recordType` | `record_type` |
| `fortune.main` | `fortune` |
| `target` | `target` |
| `{ ...card, engraving, fortuneSub: fortune.sub, timeHint }` | `ai_card` (jsonb) |

- 익명화: `import { anonymizeMemory } from "@/lib/memory-ai"` → `const { anonText, translations } = await anonymizeMemory(content)` ✅ 구현 완료
응답
```json
{ "memory": { "id": "uuid", "status": "locked", "...": "memories 테이블 행" } }
```
처리 순서
1. `users`를 `device_id`로 upsert
2. 사진 → Supabase Storage `photos` 버킷 업로드 → `photo_url`
3. `memories` insert (`status: locked`)
4. `visibility`가 `public_anonymous`면 **서버에서** AI로 익명화 + 번역 → `public_memories` insert
   - 이름·전화번호·학교 등 식별 정보 제거, 마음만 남긴 한 줄 (예: "엄마 ○○○ 수술 잘 되게" → "가족의 회복을 비는 기억")
   - 번역: `{ "ko": "...", "en": "...", "ja": "...", "zh": "..." }`
   - **브라우저가 보낸 익명화 문장을 믿지 말 것** (원문이 공개될 수 있음)
- `medium`: `lock`(자물쇠) / `paper`(원고지) / `beacon`(봉화) / `bottle`(유리병 편지) — 장소별 기본값은 `src/lib/media.ts`

## 5. `GET /api/memories?deviceId=uuid` — 내 타임캡슐 목록

응답
```json
{ "memories": [
  { "id": "uuid", "placeSlug": "hongje-falls", "placeName": "홍제폭포", "medium": "lock",
    "title": "...", "emotion": "...", "status": "locked",
    "unlockType": "date", "unlockAt": "...", "unlockNote": "...",
    "createdAt": "...", "openedAt": null,
    "content": null, "photoUrl": null }
] }
```
- **잠긴 기억은 `content`, `photoUrl`을 `null`로** (열리기 전엔 본인도 못 봄 — 타임캡슐 느낌)
- 열린 기억만 원문과 사진을 내려줌
- 최신순

## 6. `POST /api/memories/[id]/revisit` — 다시 방문, 같은 자리 판정 (AI) ✅ 구현 완료

요청
```json
{ "deviceId": "uuid", "photoDataUrl": "data:image/jpeg;base64,...", "lat": 37.58, "lng": 126.93, "demo": false }
```
응답 (열림)
```json
{ "opened": true, "sameSpot": true, "confidence": 0.82,
  "reason": "같은 암벽과 징검다리가 같은 각도로 보입니다",
  "reunionReport": "1년 전 오늘 당신은 친구들과 이 자리에서 약속을 남겼어요. ...",
  "memory": { "content": "원문", "photoUrl": "...", "...": "..." } }
```
응답 (안 열림)
```json
{ "opened": false, "sameSpot": false, "confidence": 0.3, "reason": "다른 장소로 보여요", "lockedReason": "같은 자리에서 다시 찍어 주세요" }
```
처리 순서
1. 본인 기억인지 확인 (`deviceId` → `users.id` = `memories.user_id`), 아니면 403
2. `unlock_type = date`이고 아직 날짜 전이면 → `lockedReason: "2027년 11월 6일부터 열려요"` (단, `demo: true`면 건너뜀 — 발표용)
3. AI에 **잠글 때 사진(URL) + 지금 사진** 두 장과 장소 설명을 보내 같은 자리인지 판정. 같으면 원문·잠근 날짜·오늘 날짜로 재회 리포트도 같은 호출에서 작성
4. `revisits` insert, 같으면 `memories.status = opened`, `opened_at = now()`
- mock: `sameSpot: true, confidence: 0.8`

## 7. `GET /api/places/[slug]/layer?lang=en` — 장소의 기억 층 (공개 벽)

응답
```json
{ "place": { "slug": "hongje-falls", "name": "Hongje Falls" },
  "count": 128,
  "items": [ { "id": "uuid", "text": "A promise made with friends before graduation", "createdAt": "..." } ] }
```
- `public_memories`에서 `hidden = false`만, 최신순 50개
- `text`는 `translations[lang]`, 없으면 `anon_text`

## 8. `POST /api/places/locate` — 장소 좌표 등록 (관리자)

현장에서 "현재 위치로 저장" 버튼용.

요청
```json
{ "slug": "demo-hall", "lat": 37.58, "lng": 126.92, "adminKey": "..." }
```
응답 `{ "ok": true }` / `adminKey`가 `ADMIN_KEY`와 다르면 401

---

## 화면 ↔ API

| 화면 | 쓰는 API |
|---|---|
| 입장 (GPS 자동 → 애매하면 카메라) | 1, 2 |
| 장소 화면 (기억 층 + 기억 남기기 버튼) | 7 |
| 기억 남기기 (사진·글 → 카드 → 공개 범위 → 열림 조건 → 잠금) | 3, 4 |
| 내 타임캡슐 (목록 → 다시 방문 → 열림 + 재회 리포트) | 5, 6 |
| 관리자 (좌표 저장) | 8 |

프런트 담당은 위 응답 예시를 그대로 가짜 데이터로 써서 API 완성 전에 화면부터 만들 수 있음.

---

## 9. 회원가입·로그인 (DB 담당, P0)

1년 뒤 다른 기기에서 와서 잠금을 풀어야 하므로 이메일 + 비밀번호로 가입한다.
**핵심 아이디어:** 가입하면 서버가 `users.device_id`에 추측 불가능한 토큰을 넣고, 로그인하면 그 토큰을 돌려준다.
브라우저는 토큰을 `localStorage`의 `ms_device_id`에 저장 → **기존 API(deviceId를 받는 것들)는 그대로 동작**한다.

DB (SQL Editor에서 한 번)
```sql
alter table users add column if not exists email text unique;
alter table users add column if not exists password_hash text;
```

비밀번호 저장: Node 기본 `crypto.scrypt` (새 라이브러리 X)
- 저장: `salt(16바이트 hex) + ":" + scrypt(password, salt, 64)의 hex`
- 비교: `crypto.timingSafeEqual`
- 비밀번호 원문·해시를 응답이나 로그에 절대 넣지 말 것

### 9-1. `POST /api/auth/signup`
요청 `{ "email": "a@b.com", "password": "8자 이상", "nickname": "민준", "language": "ko" }`
응답 `{ "token": "uuid", "user": { "id": "...", "email": "a@b.com", "nickname": "민준" } }`
- 이메일 형식이 틀리거나 비밀번호 8자 미만 → 400
- 이미 가입된 이메일 → 409 `{ "error": "이미 가입된 이메일이에요" }`
- `token` = 새로 만든 `crypto.randomUUID()`, `users.device_id`에 저장
- 가입 전에 같은 브라우저로 남긴 기억이 있으면(요청에 `deviceId`가 오면) 그 사용자 행에 email·password_hash를 붙여서 기억을 이어받게 해도 됨 (선택)

### 9-2. `POST /api/auth/login`
요청 `{ "email": "a@b.com", "password": "..." }`
응답 `{ "token": "...", "user": { "id": "...", "email": "...", "nickname": "..." } }`
- 이메일이 없거나 비밀번호가 틀리면 둘 다 401 `{ "error": "이메일 또는 비밀번호를 확인해 주세요" }` (어느 쪽이 틀렸는지 알려주지 않음)

### 9-3. `GET /api/auth/me?token=`
응답 `{ "user": { "id": "...", "email": "...", "nickname": "...", "language": "ko" }, "memoryCount": 3 }`
- 없는 토큰이면 401

### 로그아웃
서버 API 없음. 브라우저에서 `localStorage.removeItem("ms_device_id")`

ponytail: 토큰이 만료되지 않고 로그인 시도 횟수 제한도 없음 — MVP 한계. 정식 서비스에선 Supabase Auth로 옮기고 시도 제한 추가.

### 화면 규칙: 로그인은 메뉴에 두지 않는다
- 메뉴 트리에 로그인·회원가입 항목 없음. 기능(9-1~9-3 API)만 둔다
- 로그인 창은 필요한 순간에만 뜬다
  1. **기억을 잠글 때**: "1년 뒤 다른 기기에서도 열 수 있게 이메일로 저장할까요?" → 가입/로그인 후 잠금
  2. **다시 와서 열 때**: 이 기기에 기억이 없으면 "로그인해서 내 기억 불러오기"
