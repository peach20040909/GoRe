// GET /api/places — 장소 목록 (docs/API.md #1)
// 입장 화면이 GPS로 가장 가까운 장소를 찾을 때 사용. 거리 계산은 브라우저에서.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

type PlaceListItem = {
  slug: string;
  name_ko: string;
  name_en: string;
  lat: number | null; // 좌표가 아직 없는 장소는 null (GPS 자동 입장에서 제외)
  lng: number | null;
  radius_m: number;
};

export async function GET() {
  try {
    const places = await db<PlaceListItem[]>(
      "/places?select=slug,name_ko,name_en,lat,lng,radius_m&order=created_at.asc,slug.asc",
    );
    // 문서에 있는 필드만 명시적으로 내려준다 (description 등 다른 컬럼이 섞여 나가지 않게)
    return NextResponse.json({
      places: (places ?? []).map((p) => ({
        slug: p.slug,
        name_ko: p.name_ko,
        name_en: p.name_en,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        radius_m: p.radius_m,
      })),
    });
  } catch (e) {
    return toErrorResponse(e, "GET /api/places");
  }
}
