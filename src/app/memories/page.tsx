"use client";
// 추억 돌아보기: 걸었던 고리 위치들(지도) → 장소별 고리 → 상세 정보
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NaverMap, type MapPlace } from "@/components/NaverMap";
import { goriAsset, goriById } from "@/lib/goris";
import { loadMemories, type MemoryItem } from "@/lib/memories";
import { getToken } from "@/lib/session";

export default function MemoriesPage() {
  const router = useRouter();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then(setItems).catch((e: Error) => setError(e.message));
  }, [router]);

  // 걸었던 고리 위치들: 장소별로 묶어서 지도 핀 하나 + 개수
  const places = useMemo<MapPlace[]>(() => {
    const m = new Map<string, MapPlace>();
    for (const it of items ?? []) {
      if (!it.placeSlug) continue;
      const p = m.get(it.placeSlug) ?? { slug: it.placeSlug, name_ko: it.placeName ?? "", lat: it.placeLat, lng: it.placeLng, memoryCount: 0 };
      p.memoryCount = (p.memoryCount ?? 0) + 1;
      m.set(it.placeSlug, p);
    }
    return [...m.values()];
  }, [items]);
  const shown = (items ?? []).filter((it) => !filter || it.placeSlug === filter);

  return (
    <div className="pt-6">
      <h1 className="text-2xl font-extrabold">나의 추억</h1>
      <p className="text-sm text-muted">고리를 걸었던 장소들이에요. 다시 가면 열 수 있어요.</p>
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {!items && !error && <div className="skeleton mt-4" style={{ height: 320 }} />}
      {items?.length === 0 && (
        <div className="card mt-6 p-6 text-center">
          <p className="font-bold">아직 걸어 둔 고리가 없어요</p>
          <Link href="/" className="btn mt-4">장소 고르러 가기</Link>
        </div>
      )}
      {items && items.length > 0 && (
        <>
          <div className="mt-4"><NaverMap places={places} onSelect={(s) => setFilter((f) => (f === s ? null : s))} /></div>
          {filter && <button className="mt-2 text-sm underline" onClick={() => setFilter(null)}>전체 보기</button>}
          <ul className="mt-4 flex flex-col gap-3">
            {shown.map((it) => {
              const g = goriById(it.medium);
              return (
                <li key={it.id}>
                  <Link href={`/memories/${it.id}`} className="card flex gap-3 p-3">
                    {g && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.status === "opened" ? goriAsset(g.id).opened : goriAsset(g.id).sealed} alt="" className="h-20 w-20 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-muted">{it.placeName} · {new Date(it.createdAt).toLocaleDateString("ko-KR")}</p>
                      <p className="truncate font-bold">{it.title ?? g?.name ?? "기억"}</p>
                      <p className="text-sm text-muted">{it.status === "opened" ? "열린 기억" : `🔒 ${it.unlockNote ?? "다시 오면 열려요"}`}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
