// /api/memories — POST: 기억 저장 (docs/API.md #4)
import { NextResponse } from "next/server";
import {
  assertDeviceId,
  assertSlug,
  db,
  getPlaceBySlug,
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

const MEDIUMS = ["lock", "letter", "capsule"] as const;
const VISIBILITIES = ["private", "public_anonymous"] as const;
const UNLOCK_TYPES = ["date", "revisit", "together"] as const;

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

    // date 타입만 unlockAt 사용. 나머지는 null 로 정리.
    let unlockAt: string | null = null;
    if (unlockType === "date") {
      const raw = optionalString(body, "unlockAt");
      const t = raw ? new Date(raw) : null;
      if (!t || Number.isNaN(t.getTime())) {
        throw new HttpError(400, "unlockType 이 date 이면 올바른 unlockAt(ISO 날짜)이 필요해요");
      }
      unlockAt = t.toISOString();
    }

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
        ai_title: optionalString(body, "title")?.trim().slice(0, 200) ?? null,
        ai_keywords: parseKeywords(body.keywords),
        ai_emotion: optionalString(body, "emotion")?.trim().slice(0, 40) ?? null,
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
