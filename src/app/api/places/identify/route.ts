// A. 사진으로 장소 판정 — GPS가 애매하거나 실내일 때
import { NextResponse } from "next/server";
import { db, type Place } from "@/lib/db";
import { identifyPlace } from "@/lib/memory-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { imageDataUrl } = (await req.json()) as { imageDataUrl?: string };
    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "사진이 필요해요" }, { status: 400 });
    }
    const places = await db<Place[]>("places?select=slug,name_ko,description");
    const r = await identifyPlace(
      imageDataUrl,
      places.map((p) => ({ slug: p.slug, name: p.name_ko, description: p.description }))
    );
    // 목록에 없는 slug를 지어내면 '판정 실패'로 처리
    const slug = r.slug && places.some((p) => p.slug === r.slug) ? r.slug : null;
    return NextResponse.json({ ...r, slug });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "장소를 판정하지 못했어요" }, { status: 500 });
  }
}
