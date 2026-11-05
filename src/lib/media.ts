// 장소별 매개체와 3D 모델 등록표. 모델을 바꾸려면 public/models/에 .glb를 넣고 여기 한 줄만 고치면 됨.
// tintMaterials: 카드 색(그날의 하늘색)으로 칠할 재질 이름 (Blender 재질 이름 그대로)
import type { Medium } from "@/components/MemoryCard";

export type MediumModel = { medium: Medium; label: string; glb?: string; tintMaterials?: string[] };

export const DEFAULT_MEDIUM: MediumModel = { medium: "lock", label: "자물쇠" };

export const PLACE_MEDIA: Record<string, MediumModel> = {
  "hongje-falls": {
    medium: "bottle",
    label: "유리병 편지",
    glb: "/models/hongje-bottle.glb",
    tintMaterials: ["Cascades in mist ink"],
  },
  "ansan-jarakgil": { medium: "beacon", label: "봉화" },
  "demo-hall": {
    medium: "bottle",
    label: "유리병 편지",
    glb: "/models/hongje-bottle.glb",
    tintMaterials: ["Cascades in mist ink"],
  },
};

export const mediaFor = (slug: string) => PLACE_MEDIA[slug] ?? DEFAULT_MEDIUM;
