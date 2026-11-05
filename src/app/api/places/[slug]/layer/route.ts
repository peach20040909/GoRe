// GET /api/places/[slug]/layer?lang=en — 장소의 기억 층(공개 벽) (docs/API.md #7)
import { NextResponse } from "next/server";
import { assertSlug, db, dbCount, getPlaceBySlug, normalizeLanguage, type PublicMemoryRow } from "@/lib/db";
import { HttpError, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

const LAYER_LIMIT = 50;

type LayerRow = Pick<PublicMemoryRow, "id" | "anon_text" | "translations" | "created_at">;

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params; // Next 15: params 는 Promise
    assertSlug(slug);
    const lang = normalizeLanguage(new URL(req.url).searchParams.get("lang"));

    const place = await getPlaceBySlug(slug);
    if (!place) throw new HttpError(404, "알 수 없는 장소예요");

    // 숨김(신고·관리) 처리된 것은 제외
    const filter = `place_id=eq.${place.id}&hidden=eq.false`;
    const [rows, count] = await Promise.all([
      db<LayerRow[]>(
        `/public_memories?${filter}&select=id,anon_text,translations,created_at&order=created_at.desc&limit=${LAYER_LIMIT}`,
      ),
      dbCount(`/public_memories?${filter}&select=id`),
    ]);

    const items = (rows ?? []).map((r) => {
      const translated = r.translations?.[lang];
      return {
        id: r.id,
        // 번역본이 있으면 그것, 없으면 익명화 원문(anon_text)
        text: typeof translated === "string" && translated.trim() !== "" ? translated : r.anon_text,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({
      // 장소 이름은 ko 만 한글, 그 외 언어는 영문
      place: { slug: place.slug, name: lang === "ko" ? place.name_ko : place.name_en },
      count,
      items,
    });
  } catch (e) {
    return toErrorResponse(e, "GET /api/places/[slug]/layer");
  }
}
