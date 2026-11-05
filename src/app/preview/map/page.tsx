"use client";
// 지도 확인용: /preview/map — 홈 화면에 들어갈 네이버 지도
import { useEffect, useState } from "react";
import { NaverMap, type MapPlace } from "@/components/NaverMap";

export default function MapPreview() {
  const [places, setPlaces] = useState<MapPlace[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: MapPlace[] }) => setPlaces(d.places ?? []))
      .catch(() => setPlaces([]));
  }, []);

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-xl font-bold">기억이 걸린 장소</h1>
      <div className="mt-4">{places ? <NaverMap places={places} onSelect={setPicked} /> : <div className="skeleton" style={{ height: 480 }} />}</div>
      {picked && <p className="mt-3 text-sm text-muted">선택한 장소: {picked}</p>}
    </div>
  );
}
