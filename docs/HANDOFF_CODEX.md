# Codex 인수인계 프롬프트 (2026-11-06 새벽, 제출 09:00)

아래 블록을 Codex에 그대로 붙여 넣으면 이어서 개발할 수 있어요.

---

너는 해커톤 프로젝트 **고리 (Go:RE) — "GO AGAIN. RECONNECT."** 를 이어서 개발한다.
서울 문화 장소에 '고리'(자물쇠·유리병 같은 매개체)로 기억을 걸어 두고, 그 자리에 다시 와야(GPS+사진) 열 수 있는 위치 기반 AI 타임캡슐 서비스다.
제출은 11/6 09:00 (슬라이드·소스·GitHub 링크). **속도와 시연 안정성이 최우선.** 큰 리팩터링 금지, 작은 수정만.

## 먼저 읽을 것
- `CLAUDE.md` (규칙: Next.js 15 App Router + TS + Tailwind v4, 모바일 375px 우선, 로딩/에러/빈 상태 항상 처리)
- `docs/API.md` (API 명세), `README.md`
- 저장소: https://github.com/peach20040909/GoRe · 배포: https://go-re.vercel.app (main push → Vercel 자동 배포)

## 실행
```
npm install
npm run build        # 타입체크 포함. 커밋 전에 반드시 통과
npx next start -p 3000
```
- 시연 모드: 아무 화면에서 `?demo=1` 을 붙이면(예: `/gori/demo-hall?demo=1`) GPS 거리·날짜 잠금을 건너뜀 (`src/lib/session.ts isDemo`)
- 로그인 필요: 이메일 회원가입/로그인 → 토큰이 localStorage `ms_device_id`. 화면 테스트 시 `/login`에서 가입
- 환경변수(.env.local, Vercel): OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_KEY, NEXT_PUBLIC_NAVER_MAP_CLIENT_ID. 키는 절대 커밋/출력하지 말 것

## 구조 (핵심만)
- 디자인: Figma "해커톤 6조 / MVP 제작용" 페이지(ccS1isIoFhkIudT18JQcvQ, node 379-6627) 기준으로 구현됨
  - 토큰: `src/app/globals.css` (중립 UI, 버튼 #171717 52px R12, 타이포 클래스 t-title/t-heading/t-sub/t-body/t-strong/t-label/t-caption)
  - 공통 부품: `src/components/ds.tsx` (Header, BottomNav, Character, OptionRow, MediaTile)
  - 카메라: `src/components/CameraFeed.tsx` (getUserMedia, 실패 시 파일 선택)
- 화면
  - `/` 홈: 네이버 지도(경복궁·독립문·명지대만) + 바텀시트(주변 장소 → 장소 정보 → "여기에 마음 걸기")
  - `/gori/[slug]` 고리 플로우: 03 장소 확인(카메라+GPS) → 07 모델 미리보기(3D) → 08 사진과 편지 → AI 기억 카드 → 09 열람 조건 → 10 AR 배치(캐릭터가 걸어와 고리를 걸어 주는 애니메이션 + 저장) → 완료
  - `/gori` 하단 탭: 가장 가까운 장소로 이동
  - `/memories` 02 추억(장소 칩 필터 + 사진 카드), `/memories/[id]` 상세(잠김이면 사진+GPS로 열기 → 재회 리포트)
  - `/collection` 04 수집 배지 12종, `/collection/[id]` 05 배지 상세 (배지↔장소 연결: `src/lib/badges.ts`)
  - `/memories/[id]/delete` 고리 삭제 (추억 카드 … → 장소 확인 → 자물쇠 풀기: 위치 필수, 동행 조건이면 동행자 확인(웹이라 BLE는 흉내) → 완료). API: `DELETE /api/memories/[id]` (본인 + 장소 반경 안, demo는 건너뜀)
  - `/my` 마이 (내 추억·내 수집 개수, 설정 → 로그아웃)
  - `/login` 로그인/회원가입 (메뉴에는 노출 안 함, 비밀번호 찾기는 목업)
- 데이터
  - 고리 18종: `src/lib/goris.ts` + 파일 `public/goris/<id>/{sealed,opened,thumb}.webp, model.glb`
    - 16 myongji-horse(명지대 demo-hall), 17 dongnimmun-arch(독립문), 18 gyeongbok-borok(경복궁) 새로 추가됨
  - 장소→고리: `src/lib/media.ts mediaFor`, 장소→캐릭터(두근/산들/퐁당/해태): `characterFor`, `characterLgFor`
  - DB: Supabase (users, places, memories, public_memories, revisits). 서버 전용 `src/lib/db.ts`
  - AI: `src/lib/ai.ts` (OpenAI gpt-4o-mini, 실패 시 mock), 프롬프트 `src/lib/prompts.ts`, `src/lib/memory-ai.ts`

## 남은 일 (우선순위)
1. 휴대폰(375px)에서 전체 흐름 확인: 홈 → 장소 → 고리 플로우 → 추억 → 상세 열기 → 수집. 깨지는 레이아웃만 고치기
2. 10 AR 화면 애니메이션 다듬기 (`src/app/gori/[slug]/page.tsx` 의 hangLock / keyframes peek·hop·swing)
3. 06 자물쇠 디자인(고리 선택 패널) 화면은 아직 미구현 — 현재는 장소마다 고리가 고정. 시간 남을 때만
4. 마이 탭은 자리만 있음(비활성)
5. 스타터 잔재 페이지(`/app`, `/history`, `api/analyze`, `api/chat`)는 시연에 안 쓰임. 지워도 됨

## 규칙
- 결과 형식을 바꾸면 ResultSchema·프롬프트 JSON 예시·화면 세 곳을 같이 수정
- 커밋 전 `npm run build` 통과 확인. main에 push하면 바로 배포되니 빌드 깨진 채 push 금지
- 확인하지 않은 것을 "됐다"고 하지 말 것 (배포 반영은 go-re.vercel.app에서 직접 확인)
