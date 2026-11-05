"use client";
// 장소에 고정된 AR: 장소의 앵커 좌표(places.lat/lng) 반경 안에서만 AR이 열리고,
// 밖에서는 앵커까지 거리·방향을 안내해 모든 사람이 같은 지점에서 매개체를 놓게 함.
// ponytail: GPS 수준(수~수십 m) 고정. cm 단위 고정은 ARCore Geospatial 같은 앱 전용 기술이 필요.
import { useEffect, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer";
import { bearingDeg, compassKo, distanceM, type LatLng } from "@/lib/client";
import { mediaFor } from "@/lib/media";

type Anchor = { lat: number | null; lng: number | null; radius_m: number };

export function AnchoredAR({ slug, anchor, tint, demo = false }: { slug: string; anchor: Anchor | null; tint?: string; demo?: boolean }) {
  const media = mediaFor(slug);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (demo || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeoError(true),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [demo]);

  const hasAnchor = anchor?.lat != null && anchor?.lng != null;
  const target = hasAnchor ? { lat: anchor!.lat!, lng: anchor!.lng! } : null;
  const dist = pos && target ? distanceM(pos, target) : null;
  const inside = demo || (dist !== null && dist <= anchor!.radius_m);

  let guide = "";
  if (demo) guide = "시연 모드: 위치 확인 없이 AR을 열어요";
  else if (!hasAnchor) guide = "이 장소의 고정 지점이 아직 등록되지 않았어요";
  else if (geoError) guide = "위치 권한을 허용해야 고정 지점을 찾을 수 있어요";
  else if (dist === null) guide = "고정 지점을 찾는 중…";
  else if (inside) guide = `고정 지점에 도착했어요 · ${media.label}을(를) 이 자리에 놓아 보세요`;
  else guide = `고정 지점까지 ${Math.round(dist)}m · ${compassKo(bearingDeg(pos!, target!))}쪽으로 가 주세요`;

  return (
    <div>
      {media.glb ? (
        <ModelViewer src={media.glb} alt={media.label} tint={tint} tintMaterials={media.tintMaterials} arEnabled={inside} />
      ) : (
        <div className="card p-6 text-center text-muted">{media.label} 3D 모델 준비 중</div>
      )}
      <p className={`mt-3 rounded-xl px-4 py-3 text-sm ${inside ? "bg-brand-soft text-brand" : "bg-surface text-muted"}`}>{guide}</p>
    </div>
  );
}
