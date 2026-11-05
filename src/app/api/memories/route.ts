// /api/memories
//  - POST: 기억 저장 (docs/API.md #4)
//  - GET : 내 타임캡슐 목록 (docs/API.md #5)
import { NextResponse } from "next/server";
import {
  assertDeviceId,
  assertSlug,
  db,
  getPlaceBySlug,
  getUserByDevice,
  isUuid,
  normalizeLanguage,
  uploadPhoto,
  upsertUser,
  type MemoryRow,
  type PublicMemoryRow,
} from "@/lib/db";
import { HttpError, optionalString, readJsonBody, requireString, toErrorResponse } from "@/lib/http";
import { makePublicVersion } from "@/lib/public-memory";

export const runtime = "nodejs";

const MEDIUMS = ["lock", "paper", "beacon", "bottle"] as const; // MemoryCard·media.ts 와 같은 목록
const VISIBILITIES = ["private", "public_anonymous"] as const;
const UNLOCK_TYPES = ["date", "season", "revisit", "together"] as const;
const RECORD_TYPES = ["wish", "retro", "letter"] as const;
const TARGETS = ["self", "partner", "family", "friend", "faraway"] as const;

const MAX_CONTENT = 5000;

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T, field: string): T {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  throw new HttpError(400, `${field} 값이 올바르지 않아요 (${allowed.join(" / ")})`);
}

function parseKeywords(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((k): k is string => typeof k === "string")
    .map((k) => k.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 10);
}

/* ── draft(3번 /api/memories/draft 응답) → memories 컬럼 (docs/API.md #4 매핑표) ──
 * draft 는 브라우저를 거쳐 오므로 그대로 믿지 않는다. 화면이 멈추지 않도록
 * 이상한 값은 400 대신 null / 빈 값으로 정리하고, ai_card 는 알려진 키만 길이 제한해서 저장한다. */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function cleanStr(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function parseDraft(raw: unknown, legacy: Record<string, unknown>) {
  const d = isObj(raw) ? raw : {};
  const fortune = isObj(d.fortune) ? d.fortune : {};
  const card = isObj(d.card) ? d.card : {};
  const engraving = isObj(d.engraving) ? d.engraving : {};

  const aiCard: Record<string, unknown> = {};
  for (const [key, max] of [["color", 20], ["shape", 30], ["pattern", 30]] as const) {
    const s = cleanStr(card[key], max);
    if (s) aiCard[key] = s;
  }
  if (typeof card.glow === "number" && Number.isFinite(card.glow)) aiCard.glow = Math.min(1, Math.max(0, card.glow));
  const mine = cleanStr(engraving.mine, 200);
  const ko = cleanStr(engraving.ko, 200);
  if (mine || ko) aiCard.engraving = { ...(mine ? { mine } : {}), ...(ko ? { ko } : {}) };
  const fortuneSub = cleanStr(fortune.sub, 30);
  if (fortuneSub) aiCard.fortuneSub = fortuneSub;
  const timeHint = cleanStr(d.timeHint, 100);
  if (timeHint) aiCard.timeHint = timeHint;

  return {
    // 예전 형식(최상위 title/keywords/emotion)도 계속 받는다
    ai_title: cleanStr(d.title ?? legacy.title, 200),
    ai_keywords: parseKeywords(d.keywords ?? legacy.keywords),
    ai_emotion: cleanStr(d.emotion ?? legacy.emotion, 40),
    record_type: oneOf(d.recordType, RECORD_TYPES),
    fortune: cleanStr(fortune.main, 30),
    target: oneOf(d.target, TARGETS),
    ai_card: aiCard,
  };
}

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);

    // ── 1) 입력 검증 (DB·Storage 건드리기 전에 전부 끝낸다) ──
    const deviceId = assertDeviceId(body.deviceId);
    const nickname = optionalString(body, "nickname");
    const language = normalizeLanguage(body.language);
    const placeSlug = assertSlug(body.placeSlug);
    const medium = pickEnum(body.medium, MEDIUMS, "lock", "medium");
    const visibility = pickEnum(body.visibility, VISIBILITIES, "private", "visibility");
    const unlockType = pickEnum(body.unlockType, UNLOCK_TYPES, "revisit", "unlockType");

    const content = requireString(body, "content").trim();
    if (content.length > MAX_CONTENT) throw new HttpError(400, `기억은 ${MAX_CONTENT}자 이하로 써 주세요`);

    const photoDataUrl = optionalString(body, "photoDataUrl");

    // date(그날 이후) · season(다음 계절)만 unlockAt 사용. 나머지는 null 로 정리.
    let unlockAt: string | null = null;
    if (unlockType === "date" || unlockType === "season") {
      const raw = optionalString(body, "unlockAt");
      const t = raw ? new Date(raw) : null;
      if (!t || Number.isNaN(t.getTime())) {
        throw new HttpError(400, `unlockType 이 ${unlockType} 이면 올바른 unlockAt(ISO 날짜)이 필요해요`);
      }
      unlockAt = t.toISOString();
    }

    const draft = parseDraft(body.draft, body);

    const parentMemoryId = body.parentMemoryId ?? null;
    if (parentMemoryId !== null && !isUuid(parentMemoryId)) {
      throw new HttpError(400, "parentMemoryId 형식이 올바르지 않아요");
    }

    const place = await getPlaceBySlug(placeSlug);
    if (!place) throw new HttpError(404, "알 수 없는 장소예요");

    // ── 2) 유저 upsert ──
    const user = await upsertUser(deviceId, nickname, language);

    // 새 기억을 한 겹 더 쌓을 때: 내 기억에만 붙일 수 있다
    if (parentMemoryId) {
      const parents = await db<{ user_id: string }[]>(
        `/memories?id=eq.${parentMemoryId}&select=user_id&limit=1`,
      );
      if (!parents?.[0]) throw new HttpError(404, "이어 붙일 기억을 찾을 수 없어요");
      if (parents[0].user_id !== user.id) throw new HttpError(403, "내 기억에만 이어 붙일 수 있어요");
    }

    // ── 3) 사진 업로드 (선택) ──
    const photoUrl = photoDataUrl ? await uploadPhoto(photoDataUrl) : null;

    // ── 4) memories insert — 항상 locked 로 시작 ──
    const rows = await db<MemoryRow[]>("/memories", {
      method: "POST",
      prefer: "return=representation",
      body: {
        user_id: user.id,
        place_id: place.id,
        parent_memory_id: parentMemoryId,
        medium,
        content,
        photo_url: photoUrl,
        language,
        ...draft, // ai_title, ai_keywords, ai_emotion, record_type, fortune, target, ai_card
        visibility,
        unlock_type: unlockType,
        unlock_at: unlockAt,
        unlock_note: optionalString(body, "unlockNote")?.trim().slice(0, 300) ?? null,
        status: "locked",
      },
    });
    const memory = rows?.[0];
    if (!memory) throw new HttpError(502, "기억을 저장하지 못했어요. 다시 시도해 주세요.");

    // ── 5) 공개 익명 기억이면 서버에서 익명화 → public_memories insert ──
    // 브라우저가 보낸 익명화 문장은 받지도 않는다 (원문이 공개될 수 있음).
    // 실패해도 이미 저장된 내 기억은 유지하고, 공개만 건너뛴다.
    if (visibility === "public_anonymous") {
      try {
        const pub = await makePublicVersion({ content, language, placeName: place.name_ko });
        if (pub) {
          await db<PublicMemoryRow[]>("/public_memories", {
            method: "POST",
            prefer: "return=minimal",
            body: {
              memory_id: memory.id,
              place_id: place.id,
              anon_text: pub.anonText,
              translations: pub.translations,
            },
          });
        } else {
          console.warn(`[POST /api/memories] 익명화 결과 없음 → 공개 생략 (memory ${memory.id}). public-memory.ts TODO 확인`);
        }
      } catch (e) {
        console.error(`[POST /api/memories] 공개 처리 실패 → 비공개로만 저장됨 (memory ${memory.id})`, e);
      }
    }

    // 잠긴 기억은 응답에도 원문·사진을 싣지 않는다 (타임캡슐 규칙, GET 과 동일)
    return NextResponse.json({ memory: { ...memory, content: null, photo_url: null } });
  } catch (e) {
    return toErrorResponse(e, "POST /api/memories");
  }
}

/* ───────────────────────── GET /api/memories?deviceId=uuid ───────────────────────── */

type MemoryListRow = Pick<
  MemoryRow,
  | "id"
  | "medium"
  | "ai_title"
  | "ai_emotion"
  | "status"
  | "unlock_type"
  | "unlock_at"
  | "unlock_note"
  | "created_at"
  | "opened_at"
  | "content"
  | "photo_url"
> & { places: { slug: string; name_ko: string; name_en: string } | null };

type MemoryListItem = {
  id: string;
  placeSlug: string | null;
  placeName: string | null;
  medium: string;
  title: string | null;
  emotion: string | null;
  status: MemoryRow["status"];
  unlockType: MemoryRow["unlock_type"];
  unlockAt: string | null;
  unlockNote: string | null;
  createdAt: string;
  openedAt: string | null;
  content: string | null;
  photoUrl: string | null;
};

/**
 * ★ 핵심 규칙: 열리기 전(locked)에는 본인도 content / photoUrl 을 볼 수 없다.
 * 원문을 복사해서 null 로 덮는 방식이 아니라, status 가 정확히 "opened" 일 때만 채운다
 * (예상 밖의 status 값이 와도 잠긴 것으로 취급 → 새지 않음).
 */
function toListItem(row: MemoryListRow, language: string): MemoryListItem {
  const opened = row.status === "opened";
  const place = row.places;
  return {
    id: row.id,
    placeSlug: place?.slug ?? null,
    placeName: place ? (language === "ko" ? place.name_ko : place.name_en) : null,
    medium: row.medium,
    title: row.ai_title,
    emotion: row.ai_emotion,
    status: row.status,
    unlockType: row.unlock_type,
    unlockAt: row.unlock_at,
    unlockNote: row.unlock_note,
    createdAt: row.created_at,
    openedAt: row.opened_at,
    content: opened ? row.content : null,
    photoUrl: opened ? row.photo_url : null,
  };
}

export async function GET(req: Request) {
  try {
    const deviceId = assertDeviceId(new URL(req.url).searchParams.get("deviceId"));

    // 처음 온 기기는 빈 목록 (여기서 유저를 만들지는 않는다)
    const user = await getUserByDevice(deviceId);
    if (!user) return noStore({ memories: [] });

    const rows = await db<MemoryListRow[]>(
      `/memories?user_id=eq.${user.id}` +
        "&select=id,medium,ai_title,ai_emotion,status,unlock_type,unlock_at,unlock_note,created_at,opened_at,content,photo_url,places(slug,name_ko,name_en)" +
        "&order=created_at.desc&limit=200",
    );

    return noStore({ memories: (rows ?? []).map((r) => toListItem(r, user.language)) });
  } catch (e) {
    return toErrorResponse(e, "GET /api/memories");
  }
}

/** 개인 기억 목록이라 CDN/브라우저 캐시에 남기지 않는다 */
function noStore(data: unknown) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
