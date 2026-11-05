"use client";
// 하단 탭 "고리": 지금 위치에서 가장 가까운 장소의 고리 화면으로. 위치를 못 받으면 홈(지도)으로.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPosition, placesNearby, type PlaceLite } from "@/lib/client";
import { isDemo } from "@/lib/session";

export default function GoriTab() {
  const router = useRouter();
  useEffect(() => {
    if (isDemo()) return router.replace("/gori/demo-hall");
    Promise.all([fetch("/api/places").then((r) => r.json()) as Promise<{ places?: PlaceLite[] }>, getPosition()])
      .then(([d, pos]) => {
        const near = pos && placesNearby(d.places ?? [], pos)[0];
        router.replace(near ? `/gori/${near.slug}` : "/");
      })
      .catch(() => router.replace("/"));
  }, [router]);
  return <p className="t-label p-10 text-center text-muted">가까운 장소를 찾고 있어요…</p>;
}
