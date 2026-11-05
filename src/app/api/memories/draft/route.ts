// B·C·D·E. 기억 이해 + 카드 디자인 값 + 열림 조건 제안 (DB 저장 안 함)
import { NextResponse } from "next/server";
import { getPlace } from "@/lib/db";
import { draftMemory } from "@/lib/memory-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { placeSlug, content, language, photoDataUrl } = (await req.json()) as {
      placeSlug?: string;
      content?: string;
      language?: string;
      photoDataUrl?: string;
    };
    if (!placeSlug || !content?.trim()) {
      return NextResponse.json({ error: "장소와 기억 내용이 필요해요" }, { status: 400 });
    }
    if (content.length > 2000) {
      return NextResponse.json({ error: "기억은 2000자 이내로 남겨 주세요" }, { status: 400 });
    }
    const place = await getPlace(placeSlug);
    if (!place) return NextResponse.json({ error: "없는 장소예요" }, { status: 404 });

    const draft = await draftMemory({
      content: content.trim(),
      language: language || "ko",
      placeName: place.name_ko,
      photoDataUrl: photoDataUrl?.startsWith("data:image/") ? photoDataUrl : undefined,
    });
    if (!draft.safe) {
      return NextResponse.json(
        { error: "이 기억은 남길 수 없어요. 다른 사람을 해치는 표현은 빼고 다시 써 주세요.", reason: draft.unsafeReason },
        { status: 422 }
      );
    }
    return NextResponse.json(draft);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "기억을 정리하지 못했어요" }, { status: 500 });
  }
}
