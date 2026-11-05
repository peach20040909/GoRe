// MEMORY SEOUL의 AI 기능 모음 (서버 전용). 프롬프트·응답 형식은 prompts.ts.
// 모든 함수는 키가 없거나 응답이 이상하면 시연용 예시 응답을 돌려주고 mocked: true를 붙임 → 화면이 멈추지 않음.
import { extractJson, generate } from "@/lib/ai";
import {
  AnonymizeSchema,
  DraftSchema,
  IdentifySchema,
  RevisitSchema,
  anonymizePrompt,
  draftPrompt,
  identifyPrompt,
  revisitPrompt,
  type Draft,
} from "@/lib/prompts";
import type { ZodType } from "zod";

type Mocked<T> = T & { mocked: boolean };

async function ask<T>(
  p: { system: string; prompt: string },
  schema: ZodType<T>,
  fallback: T,
  images: string[] = []
): Promise<Mocked<T>> {
  const out = await generate({ ...p, json: true, images });
  if (!out.mocked) {
    try {
      const parsed = schema.safeParse(extractJson(out.text));
      if (parsed.success) return { ...parsed.data, mocked: false };
      console.error("[memory-ai] 응답 형식 불일치:", parsed.error.issues.slice(0, 3));
    } catch (e) {
      console.error("[memory-ai] JSON 파싱 실패:", e);
    }
  }
  return { ...fallback, mocked: true };
}

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD

/** A. 사진이 어느 장소인지 */
export function identifyPlace(imageDataUrl: string, places: { slug: string; name: string; description: string }[]) {
  return ask(identifyPrompt(places), IdentifySchema, { slug: "demo-hall", confidence: 0.9, reason: "(예시 응답) 시연용 장소로 판정했어요" }, [
    imageDataUrl,
  ]);
}

/** B·C·D·E. 안전 필터 + 기억 이해 + 카드 디자인 값 + 열림 조건 제안 */
export function draftMemory(input: { content: string; language: string; placeName: string; photoDataUrl?: string }) {
  const nextYear = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const fallback: Draft = {
    safe: true,
    unsafeReason: null,
    recordType: "wish",
    fortune: { main: "reunion", sub: null },
    target: "self",
    emotion: "설렘",
    timeHint: null,
    title: "이 자리에 맡겨 둔 약속",
    keywords: ["약속", "서울"],
    card: { color: "#7FA7D9", shape: "single", pattern: "물결", glow: 0.6 },
    engraving: { mine: "다시 만나요, 이 자리에서", ko: "다시 만나요, 이 자리에서" },
    unlockOptions: [
      { type: "revisit", unlockAt: null, note: "이 자리에 다시 오면 열려요" },
      { type: "date", unlockAt: `${nextYear}T00:00:00+09:00`, note: "1년 뒤 오늘, 이 자리에서 열려요" },
    ],
  };
  const p = draftPrompt({ ...input, today: today(), hasPhoto: !!input.photoDataUrl });
  return ask(p, DraftSchema, fallback, input.photoDataUrl ? [input.photoDataUrl] : []);
}

/** F. 공개 기억 벽용 익명 한 줄 + 번역. 원문은 절대 돌려주지 않음 */
export async function anonymizeMemory(content: string) {
  const r = await ask(anonymizePrompt(content), AnonymizeSchema, {
    anonText: "이 자리에 남겨진 소중한 기억",
    translations: {
      ko: "이 자리에 남겨진 소중한 기억",
      en: "A precious memory left in this place",
      ja: "この場所に残された大切な記憶",
      zh: "留在这里的珍贵记忆",
    },
  });
  return { anonText: r.anonText, translations: r.translations, mocked: r.mocked };
}

/** 꺼내기. 같은 자리 판정 + 재회 리포트. originalPhotoUrl이 있으면 두 사진을 비교 */
export function judgeRevisit(input: {
  newPhotoDataUrl: string;
  originalPhotoUrl?: string | null;
  placeName: string;
  placeDescription: string;
  language: string;
  content: string;
  lockedAt: string;
}) {
  const images = [...(input.originalPhotoUrl ? [input.originalPhotoUrl] : []), input.newPhotoDataUrl];
  const p = revisitPrompt({ ...input, today: today(), hasOriginal: !!input.originalPhotoUrl });
  return ask(
    p,
    RevisitSchema,
    {
      sameSpot: true,
      confidence: 0.8,
      reason: "(예시 응답) 같은 자리로 판정했어요",
      reunionReport: "그날 이 자리에 남긴 기억을 다시 꺼냈어요. 그 사이 계절이 바뀌었네요. 지금의 마음도 한 줄 더 남겨 볼까요?",
    },
    images
  );
}
