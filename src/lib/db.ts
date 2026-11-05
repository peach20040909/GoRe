// 고리(Go:RE) — Supabase 접근 공통 모듈 (★ 서버 전용: API 라우트에서만 import)
// - 라이브러리 없이 fetch만 사용 (Supabase REST + Storage)
// - SUPABASE_SERVICE_ROLE_KEY 는 서버에서만 읽는다. NEXT_PUBLIC_ 붙이기 금지,
//   "use client" 컴포넌트에서 이 파일을 import 하면 안 됨.
import { randomUUID } from "node:crypto";
import { HttpError } from "./http";

/* ───────────────────────── 타입 (supabase/schema.sql 기준) ───────────────────────── */

export type Language = "ko" | "en" | "ja" | "zh";
export const LANGUAGES: readonly Language[] = ["ko", "en", "ja", "zh"];

export type UserRow = {
  id: string;
  device_id: string;
  nickname: string | null;
  language: string;
  created_at: string;
};

export type PlaceRow = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  description: string;
  created_at: string;
};

export type MemoryRow = {
  id: string;
  user_id: string;
  place_id: string;
  parent_memory_id: string | null;
  medium: string;
  content: string;
  photo_url: string | null;
  language: string;
  ai_title: string | null;
  ai_keywords: string[];
  ai_emotion: string | null;
  visibility: "private" | "public_anonymous";
  // 기억 카드 (supabase/migrations/002_memory_card.sql)
  record_type: string | null; // wish | retro | letter
  fortune: string | null; // 운 카테고리(주)
  target: string | null; // self | partner | family | friend | faraway
  ai_card: Record<string, unknown>; // 카드 디자인 값·각인 문구
  unlock_type: "date" | "season" | "revisit" | "together";
  unlock_at: string | null;
  unlock_note: string | null;
  status: "locked" | "opened";
  created_at: string;
  opened_at: string | null;
};

export type PublicMemoryRow = {
  id: string;
  memory_id: string;
  place_id: string;
  anon_text: string;
  translations: Record<string, string>;
  hidden: boolean;
  created_at: string;
};

/** 팀원 코드(places/identify 등)가 쓰는 이름. 같은 행 타입의 별칭 */
export type User = UserRow;
export type Place = PlaceRow;

/* ───────────────────────── 내부: 환경변수 · 에러 ───────────────────────── */

const PHOTO_BUCKET = "photos";
const TIMEOUT_MS = 20_000;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel 요청 한도(4.5MB) 안쪽

/** Supabase 쪽 실패. 상세는 서버 로그에만, 사용자에게는 일반 메시지만 내려간다. */
class DbError extends HttpError {
  constructor(detail: string) {
    super(502, "데이터베이스 요청에 실패했어요. 잠시 후 다시 시도해 주세요.", detail);
    this.name = "DbError";
  }
}

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const v = process.env[name]?.trim();
  if (!v) throw new HttpError(500, `서버 환경변수 ${name} 이(가) 설정되지 않았어요`);
  return v;
}

function baseUrl(): string {
  return requireEnv("SUPABASE_URL").replace(/\/+$/, "");
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function request(url: string, init: RequestInit, label: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new DbError(`${label} 연결 실패: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/* ───────────────────────── 입력 검증 헬퍼 ───────────────────────── */

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{8,100}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertDeviceId(v: unknown): string {
  if (typeof v !== "string" || !DEVICE_ID_RE.test(v)) throw new HttpError(400, "deviceId 형식이 올바르지 않아요");
  return v;
}

export function assertSlug(v: unknown): string {
  if (typeof v !== "string" || !SLUG_RE.test(v)) throw new HttpError(400, "slug 형식이 올바르지 않아요");
  return v;
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** 지원하지 않는 언어는 한국어로 (화면이 멈추지 않게 에러 대신 기본값) */
export function normalizeLanguage(v: unknown): Language {
  return typeof v === "string" && (LANGUAGES as readonly string[]).includes(v) ? (v as Language) : "ko";
}

/* ───────────────────────── REST 호출 ───────────────────────── */

export type DbOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON으로 직렬화되어 전송됨 */
  body?: unknown;
  /** PostgREST Prefer 헤더. 예: "return=representation", "resolution=merge-duplicates,return=representation" */
  prefer?: string;
};

/**
 * Supabase REST(PostgREST) 호출.
 * @param path 예: "/places?select=slug,name_ko&order=created_at.asc"  (앞의 /rest/v1 은 생략)
 * @returns 파싱된 JSON. 응답 본문이 비어 있으면(return=minimal 등) null
 *
 * prefer 를 생략하면 쓰기(POST/PATCH/PUT/DELETE)는 "return=representation" 으로 보내 변경된 행을 돌려준다.
 * (팀원 코드 memories/[id]/revisit 가 `const [row] = await db(PATCH …)` 로 행을 받기 때문)
 * 행이 필요 없으면 prefer: "return=minimal" 을 줄 것.
 * 필터 값은 호출하는 쪽에서 encodeURIComponent 로 감쌀 것.
 */
export async function db<T = unknown>(path: string, opts: DbOptions = {}): Promise<T> {
  const { method = "GET", body } = opts;
  const prefer = opts.prefer ?? (method === "GET" ? undefined : "return=representation");
  const url = `${baseUrl()}/rest/v1/${path.replace(/^\/+/, "")}`;
  const headers = authHeaders({
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(prefer ? { Prefer: prefer } : {}),
  });

  const res = await request(
    url,
    { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined },
    `REST ${method} ${path.split("?")[0]}`,
  );
  const text = await res.text();
  if (!res.ok) {
    throw new DbError(`REST ${method} ${path.split("?")[0]} → ${res.status} ${text.slice(0, 500)}`);
  }
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

/** 조건에 맞는 행의 총 개수 (limit 무관). 예: dbCount("/public_memories?place_id=eq.<id>&hidden=eq.false") */
export async function dbCount(path: string): Promise<number> {
  const table = path.split("?")[0];
  const res = await request(
    `${baseUrl()}/rest/v1/${path.replace(/^\/+/, "")}`,
    { method: "HEAD", headers: authHeaders({ Prefer: "count=exact" }) },
    `REST HEAD ${table}`,
  );
  if (!res.ok) throw new DbError(`REST HEAD ${table} → ${res.status}`);
  // Content-Range: "0-49/128" 또는 "*/0"
  const total = Number(res.headers.get("content-range")?.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

/* ───────────────────────── 사진 업로드 (Supabase Storage) ───────────────────────── */

/**
 * data URL(JPEG/PNG/WebP)을 `photos` 버킷에 올리고 공개 URL을 돌려준다.
 * 형식이 잘못되면 400, 4MB 초과면 413.
 */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(",");
  const meta = comma > 0 ? /^data:(image\/(?:jpeg|png|webp));base64$/i.exec(dataUrl.slice(0, comma)) : null;
  if (!meta) throw new HttpError(400, "사진 형식이 올바르지 않아요 (JPEG/PNG/WebP data URL만 가능해요)");

  const mime = meta[1].toLowerCase();
  const ext = mime === "image/jpeg" ? "jpg" : mime.slice("image/".length);
  const bytes = Buffer.from(dataUrl.slice(comma + 1), "base64");
  if (bytes.length === 0) throw new HttpError(400, "사진 데이터가 비어 있어요");
  if (bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, "사진이 너무 커요 (4MB 이하로 줄여 주세요)");

  const key = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`; // 예: 2026-11/uuid.jpg
  const res = await request(
    `${baseUrl()}/storage/v1/object/${PHOTO_BUCKET}/${key}`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": mime, "x-upsert": "false", "cache-control": "max-age=31536000" }),
      body: new Uint8Array(bytes),
    },
    "Storage upload",
  );
  if (!res.ok) throw new DbError(`Storage upload → ${res.status} ${(await res.text()).slice(0, 300)}`);

  return `${baseUrl()}/storage/v1/object/public/${PHOTO_BUCKET}/${key}`;
}

/* ───────────────────────── users ───────────────────────── */

/**
 * users 를 읽을 때는 항상 이 컬럼만 고른다 (select=* 금지).
 * users 에는 email / password_hash 가 있어서, 모든 컬럼을 읽으면 해시가 코드 안으로 섞여 들어온다.
 * 해시가 필요한 곳은 src/lib/auth.ts 의 로그인뿐이다.
 */
const USER_COLUMNS = "id,device_id,nickname,language,created_at";

/**
 * device_id 로 유저 upsert 후 행을 돌려준다.
 * nickname 이 비어 있으면 기존 닉네임을, language 를 생략하면 기존 언어를 덮어쓰지 않는다.
 */
export async function upsertUser(deviceId: string, nickname?: string | null, language?: string): Promise<UserRow> {
  assertDeviceId(deviceId);
  const nick = typeof nickname === "string" ? nickname.trim().slice(0, 40) : "";
  const rows = await db<UserRow[]>(`/users?on_conflict=device_id&select=${USER_COLUMNS}`, {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      device_id: deviceId,
      ...(language !== undefined ? { language: normalizeLanguage(language) } : {}),
      ...(nick ? { nickname: nick } : {}),
    },
  });
  const user = rows?.[0];
  if (!user) throw new DbError("users upsert 결과가 비어 있음");
  return user;
}

/** device_id 로 유저 조회. 없으면 null */
export async function getUserByDevice(deviceId: string): Promise<UserRow | null> {
  assertDeviceId(deviceId);
  const rows = await db<UserRow[]>(`/users?device_id=eq.${encodeURIComponent(deviceId)}&select=${USER_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

/* ───────────────────────── places ───────────────────────── */

/** slug 로 장소 조회. 없으면 null */
export async function getPlaceBySlug(slug: string): Promise<PlaceRow | null> {
  assertSlug(slug);
  const rows = await db<PlaceRow[]>(`/places?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
  return rows?.[0] ?? null;
}

/**
 * 팀원 코드(memories/draft)가 쓰는 이름. getPlaceBySlug 와 같지만
 * 형식이 이상한 slug 는 400 대신 null 을 돌려준다 (호출부가 "없는 장소" 404 로 처리).
 */
export async function getPlace(slug: string): Promise<PlaceRow | null> {
  return SLUG_RE.test(slug) ? getPlaceBySlug(slug) : null;
}
