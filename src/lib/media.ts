// 장소 → 그 장소의 고리(매개체). 장소 전용 고리가 없으면 기본 고리(사랑의 자물쇠).
// 고리 데이터·파일은 src/lib/goris.ts
import type { Medium } from "@/components/MemoryCard";
import { DEFAULT_GORI, GORIS, goriAsset, goriById } from "@/lib/goris";

export type MediumModel = { goriId: string; medium: Medium; label: string; glb?: string; tintMaterials?: string[] };

// placeSlug가 goris.ts에 없는 장소의 고리 지정 (시연 장소 등)
const PLACE_OVERRIDE: Record<string, string> = {};

export function mediaFor(slug: string): MediumModel {
  const g = goriById(PLACE_OVERRIDE[slug] ?? "") ?? GORIS.find((x) => x.placeSlug === slug) ?? DEFAULT_GORI;
  return { goriId: g.id, medium: g.cardShape, label: g.name, glb: goriAsset(g.id).model };
}

// 장소 → 지도/목록에 쓰는 캐릭터 (Figma 캐릭터: 두근·산들·퐁당·해태 고리). 없으면 두근고리
const CHARACTER: Record<string, string> = {
  gyeongbokgung: "haetae",
  dongnimmun: "mountain",
  "ansan-beacon": "mountain",
  "hongje-falls": "waterfall",
  "demo-hall": "heart",
};
export const characterFor = (slug?: string | null) => `/ds/char-${CHARACTER[slug ?? ""] ?? "heart"}.webp`;
export const characterLgFor = (slug?: string | null) => characterFor(slug).replace(".webp", "-lg.webp");
