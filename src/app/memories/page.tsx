"use client";
// 02 추억 (Figma): 장소 필터 칩 + 기억 사진 카드 피드 → 상세
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav, Character, Header } from "@/components/ds";
import { goriAsset, goriById } from "@/lib/goris";
import { loadMemories, type MemoryItem } from "@/lib/memories";
import { getToken } from "@/lib/session";

const fmt = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "").replace(/\.$/, "");

/* eslint-disable @next/next/no-img-element */
export default function MemoriesPage() {
  const router = useRouter();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then(setItems).catch((e: Error) => setError(e.message));
  }, [router]);

  // 걸었던 고리 위치들 → 필터 칩
  const places = useMemo(() => [...new Map((items ?? []).filter((i) => i.placeSlug).map((i) => [i.placeSlug!, i.placeName ?? ""])).entries()], [items]);
  const shown = (items ?? []).filter((it) => !filter || it.placeSlug === filter);
  const chip = (on: boolean) => `t-strong h-8 shrink-0 rounded-lg px-3 ${on ? "bg-text text-white" : "border border-[#e0e1e6] text-muted"}`;

  return (
    <div className="min-h-dvh">
      <Header title="추억" />
      <div className="flex gap-2 overflow-x-auto px-6 pb-4 pt-2.5">
        <button className={chip(!filter)} onClick={() => setFilter(null)}>전체</button>
        {places.map(([slug, name]) => (
          <button key={slug} className={chip(filter === slug)} onClick={() => setFilter(slug)}>{name}</button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        {error && <p role="alert" className="t-label rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{error}</p>}
        {!items && !error && [0, 1].map((i) => <div key={i} className="skeleton h-[236px]" />)}
        {items?.length === 0 && (
          <div className="rounded-2xl border border-line p-6 text-center">
            <p className="t-strong">아직 걸어 둔 고리가 없어요</p>
            <Link href="/" className="btn mt-4 w-full">장소 고르러 가기</Link>
          </div>
        )}
        {shown.map((it) => {
          const g = goriById(it.medium);
          const img = it.status === "opened" && it.photoUrl ? it.photoUrl : g ? (it.status === "opened" ? goriAsset(g.id).opened : goriAsset(g.id).sealed) : null;
          return (
            <Link key={it.id} href={`/memories/${it.id}`} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="flex h-[76px] items-center gap-3 p-4">
                <Character slug={it.placeSlug} size={40} />
                <div className="min-w-0">
                  <p className="t-strong truncate">{it.title ?? g?.name ?? "기억"}</p>
                  <p className="t-caption text-muted">{it.placeName} · {fmt(it.createdAt)}{it.status === "locked" && " · 🔒 잠김"}</p>
                </div>
              </div>
              {img && <img src={img} alt="" className="h-40 w-full bg-canvas object-cover" />}
            </Link>
          );
        })}
      </div>
      <BottomNav active="memories" />
    </div>
  );
}
