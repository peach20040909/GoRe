"use client";
// 홈: 기억이 걸린 장소 지도. 핀을 누르면 그 장소의 매개체(3D·AR) 화면으로.
// 디자인 확정 전 임시 레이아웃 — 지도 부품(NaverMap)과 데이터 흐름은 그대로 쓰면 됨.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NaverMap, type MapPlace } from "@/components/NaverMap";

// 홈 지도에 보일 장소만 (다른 장소는 DB에 있고 고리·해금은 그대로 동작)
const HOME_PLACES = ["gyeongbokgung", "dongnimmun", "demo-hall"];

export default function Home() {
  const router = useRouter();
  const [places, setPlaces] = useState<MapPlace[] | null>(null);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: MapPlace[] }) => setPlaces((d.places ?? []).filter((p) => HOME_PLACES.includes(p.slug))))
      .catch(() => setPlaces([]));
  }, []);

  const open = useCallback((slug: string) => router.push(`/preview/ar?place=${slug}`), [router]);

  return (
    <div className="pt-6">
      <p className="text-sm font-semibold tracking-wide text-brand">GO AGAIN. RECONNECT.</p>
      <h1 className="mt-1 text-2xl font-extrabold">기억을 맡겨 둘 장소를 골라 보세요</h1>
      <div className="mt-4">{places ? <NaverMap places={places} onSelect={open} /> : <div className="skeleton" style={{ height: 480 }} />}</div>
      {places && places.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {places.map((p) => (
            <li key={p.slug}>
              <button onClick={() => open(p.slug)} className="card w-full p-4 text-left">
                <span className="font-bold">{p.name_ko}</span>
                <span className="block text-sm text-muted">기억 {p.memoryCount ?? 0}개</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
