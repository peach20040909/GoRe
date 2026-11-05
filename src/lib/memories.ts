// 추억 화면에서 쓰는 기억 목록 타입·불러오기 (GET /api/memories)
import { api } from "@/lib/client";
import { getToken } from "@/lib/session";

export type MemoryItem = {
  id: string;
  placeSlug: string | null;
  placeName: string | null;
  placeLat: number | null;
  placeLng: number | null;
  medium: string;
  title: string | null;
  emotion: string | null;
  status: "locked" | "opened";
  unlockType: "date" | "season" | "revisit" | "together";
  unlockAt: string | null;
  unlockNote: string | null;
  createdAt: string;
  openedAt: string | null;
  content: string | null;
  photoUrl: string | null;
  card: { color?: string; shape?: string; pattern?: string; glow?: number; engraving?: { mine?: string; ko?: string }; photoCredit?: { author: string; sourceUrl: string; license: string; licenseUrl: string } } | null;
};

export async function loadMemories(): Promise<MemoryItem[]> {
  const r = await api<{ memories: MemoryItem[] }>(`/api/memories?deviceId=${encodeURIComponent(getToken() ?? "")}`);
  return r.memories;
}
