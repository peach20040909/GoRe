"use client";
// 홈 화면 지도: 네이버 지도(Dynamic Map)에 장소 핀 + "기억 N개" 표시.
// 필요: NEXT_PUBLIC_NAVER_MAP_CLIENT_ID, 네이버 콘솔 '웹 서비스 URL'에 접속 주소 등록 (localhost:3000, go-re.vercel.app)
import { useEffect, useRef, useState } from "react";
import { characterFor } from "@/lib/media";

export type MapPlace = { slug: string; name_ko: string; lat: number | null; lng: number | null; memoryCount?: number };

// 네이버 지도 SDK에서 쓰는 부분만 타입으로
type LatLng = unknown;
type NaverMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => { fitBounds(b: unknown, m?: unknown): void; destroy?(): void };
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new (a: LatLng, b: LatLng) => { extend(p: LatLng): void };
  Marker: new (opts: Record<string, unknown>) => unknown;
  Event: { addListener(target: unknown, name: string, fn: () => void): void };
};
declare global {
  interface Window {
    naver?: { maps: NaverMaps };
    navermap_authFailure?: () => void;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
let sdk: Promise<NaverMaps> | null = null;

function loadSdk(): Promise<NaverMaps> {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${CLIENT_ID}`;
    s.async = true;
    s.onload = () => (window.naver?.maps ? resolve(window.naver.maps) : reject(new Error("지도를 불러오지 못했어요")));
    s.onerror = () => reject(new Error("지도를 불러오지 못했어요"));
    document.head.appendChild(s);
  });
  return sdk;
}

// DS / Character map marker (56×72 핀 + 44px 캐릭터) + DS / Map place label
const pin = (name: string, img: string) =>
  `<div style="transform:translate(-50%,-72px);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer">
    <div style="position:relative;width:56px;height:72px">
      <img src="/ds/pin.svg" width="56" height="72" style="position:absolute;inset:0" alt="">
      <div style="position:absolute;left:6px;top:5px;width:44px;height:44px;border-radius:999px;overflow:hidden;background:#f5f0e9;display:flex;justify-content:center">
        <img src="${img}" style="height:46px;margin-top:3px" alt=""></div></div>
    <div style="background:#fff;border-radius:8px;padding:6px 12px;font:500 14px/20px Pretendard,system-ui;color:#171717;white-space:nowrap;box-shadow:0 4px 8px rgba(0,0,0,.08)">${name}</div></div>`;

type Props = {
  places: MapPlace[];
  onSelect?: (slug: string) => void;
  onMapClick?: () => void; // 핀이 아닌 빈 지도를 눌렀을 때 (홈: 바텀시트 내리기)
  bottomInset?: number; // 지도 아래를 덮는 시트 높이. 바뀌면 핀이 보이는 영역에 오도록 다시 맞춤
  className?: string;
  height?: string;
  square?: boolean;
  compact?: boolean;
};

export function NaverMap({ places, onSelect, onMapClick, bottomInset = 0, className, height = "min(70vh, 480px)", square, compact = false }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const fit = useRef<((bottom: number) => void) | null>(null);
  const inset = useRef(bottomInset);
  inset.current = bottomInset;
  const mapClick = useRef(onMapClick);
  mapClick.current = onMapClick;
  const [error, setError] = useState<string | null>(CLIENT_ID ? null : "지도 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 없어요");

  useEffect(() => {
    if (!CLIENT_ID || !el.current) return;
    let disposed = false;
    let map: InstanceType<NaverMaps["Map"]> | undefined;
    window.navermap_authFailure = () => setError("지도 인증에 실패했어요. 네이버 콘솔의 웹 서비스 URL을 확인해 주세요");
    const pts = places.filter((p) => p.lat != null && p.lng != null);
    loadSdk()
      .then((maps) => {
        if (disposed || !el.current) return;
        const center = pts[0] ? new maps.LatLng(pts[0].lat!, pts[0].lng!) : new maps.LatLng(37.5791, 126.9368);
        map = new maps.Map(el.current, { center, zoom: 14 });
        if (pts.length > 1) {
          const b = new maps.LatLngBounds(center, center);
          pts.forEach((p) => b.extend(new maps.LatLng(p.lat!, p.lng!)));
          // 위: 지도 위에 띄운 제목 + 핀 높이 / 좌우: 이름표가 안 잘리게 / 아래: 시트에 가리지 않게
          fit.current = (bottom) => map?.fitBounds(b, { top: compact ? 100 : 150, right: 70, bottom: (compact ? 50 : 30) + bottom, left: 70 });
          fit.current(inset.current);
        }
        let markerAt = 0; // 핀을 누를 때 지도 클릭이 같이 오면 무시
        maps.Event.addListener(map, "click", () => {
          if (Date.now() - markerAt > 300) mapClick.current?.();
        });
        pts.forEach((p) => {
          const m = new maps.Marker({
            position: new maps.LatLng(p.lat!, p.lng!),
            map,
            title: p.name_ko,
            icon: { content: pin(p.name_ko, characterFor(p.slug)) },
          });
          maps.Event.addListener(m, "click", () => {
            markerAt = Date.now();
            onSelect?.(p.slug);
          });
        });
      })
      .catch((e: Error) => setError(e.message));
    return () => { disposed = true; fit.current = null; map?.destroy?.(); };
  }, [places, onSelect, compact]);

  useEffect(() => fit.current?.(bottomInset), [bottomInset]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height, borderRadius: square ? 0 : 16, overflow: "hidden", background: "#f5f5f5" }}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {error && (
        <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "#6b6f76", fontSize: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}
