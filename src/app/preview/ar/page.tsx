"use client";
// 3D·AR 확인용: /preview/ar?place=hongje-falls  (시연: &demo=1 이면 위치 확인 없이 AR)
import { useEffect, useState } from "react";
import { AnchoredAR } from "@/components/AnchoredAR";
import { mediaFor } from "@/lib/media";

type Place = { slug: string; name_ko: string; lat: number | null; lng: number | null; radius_m: number };
const SKY = ["#87CEEB", "#E07A5F", "#F2A541", "#7FA7D9"];

export default function ArPreview() {
  const [params, setParams] = useState<{ slug: string; demo: boolean } | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [tint, setTint] = useState(SKY[0]);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const slug = q.get("place") || "hongje-falls";
    setParams({ slug, demo: q.get("demo") === "1" });
    // 장소 좌표는 /api/places (DB 담당 API). 아직 없으면 '고정 지점 미등록'으로 표시됨
    fetch("/api/places")
      .then((r) => (r.ok ? r.json() : { places: [] }))
      .then((d: { places?: Place[] }) => setPlace(d.places?.find((p) => p.slug === slug) ?? null))
      .catch(() => setPlace(null));
  }, []);

  if (!params) return null;
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-xl font-bold">
        {place?.name_ko ?? params.slug} · {mediaFor(params.slug).label}
      </h1>
      <div className="mt-4 flex gap-2">
        {SKY.map((c) => (
          <button
            key={c}
            aria-label={`색 ${c}`}
            onClick={() => setTint(c)}
            className="h-11 w-11 rounded-full border-2"
            style={{ background: c, borderColor: tint === c ? "#17181a" : "transparent" }}
          />
        ))}
      </div>
      <div className="mt-4">
        <AnchoredAR slug={params.slug} anchor={place} tint={tint} demo={params.demo} />
      </div>
    </div>
  );
}
