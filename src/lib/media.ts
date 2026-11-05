// 장소 → 그 장소의 고리(매개체). 장소 전용 고리가 없으면 기본 고리(사랑의 자물쇠).
// 고리 데이터·파일은 src/lib/goris.ts
import type { Medium } from "@/components/MemoryCard";
import { DEFAULT_GORI, GORIS, goriAsset, goriById } from "@/lib/goris";

export type MediumModel = { goriId: string; medium: Medium; label: string; glb?: string; tintMaterials?: string[] };

// placeSlug가 goris.ts에 없는 장소의 고리 지정 (시연 장소 등)
const PLACE_OVERRIDE: Record<string, string> = { "demo-hall": "glass-bottle" };

export function mediaFor(slug: string): MediumModel {
  const g = goriById(PLACE_OVERRIDE[slug] ?? "") ?? GORIS.find((x) => x.placeSlug === slug) ?? DEFAULT_GORI;
  return { goriId: g.id, medium: g.cardShape, label: g.name, glb: goriAsset(g.id).model };
}
