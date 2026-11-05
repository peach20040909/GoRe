// POST /api/places/locate — 장소 좌표 등록(관리자) (docs/API.md #8)
// 현장에서 "현재 위치로 저장" 버튼용. adminKey 가 환경변수 ADMIN_KEY 와 같을 때만 수정.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { assertSlug, db } from "@/lib/db";
import { HttpError, readJsonBody, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

/** 길이·타이밍 정보가 새지 않도록 해시끼리 상수 시간 비교 */
function sameSecret(given: unknown, expected: string): boolean {
  if (typeof given !== "string") return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function parseCoord(v: unknown, field: "lat" | "lng", limit: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > limit) {
    throw new HttpError(400, `${field} 는 ${-limit}~${limit} 사이의 숫자여야 해요`);
  }
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);

    // ADMIN_KEY 가 비어 있으면 ""=="" 로 뚫리지 않도록 설정 자체를 먼저 요구
    const adminKey = process.env.ADMIN_KEY?.trim();
    if (!adminKey) throw new HttpError(500, "서버 환경변수 ADMIN_KEY 이(가) 설정되지 않았어요");
    if (!sameSecret(body.adminKey, adminKey)) throw new HttpError(401, "관리자 키가 올바르지 않아요");

    const slug = assertSlug(body.slug);
    const lat = parseCoord(body.lat, "lat", 90);
    const lng = parseCoord(body.lng, "lng", 180);

    const updated = await db<{ slug: string }[]>(`/places?slug=eq.${encodeURIComponent(slug)}&select=slug`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { lat, lng },
    });
    if (!updated?.length) throw new HttpError(404, "알 수 없는 장소예요");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e, "POST /api/places/locate");
  }
}
