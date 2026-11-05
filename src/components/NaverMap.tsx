"use client";
// 홈 화면 지도: 네이버 지도(Dynamic Map)에 장소 핀 + "기억 N개" 표시.
// 필요: NEXT_PUBLIC_NAVER_MAP_CLIENT_ID, 네이버 콘솔 '웹 서비스 URL'에 접속 주소 등록 (localhost:3000, go-re.vercel.app)
import { useEffect, useRef, useState } from "react";
import { characterFor } from "@/lib/media";

export type MapPlace = { slug: string; name_ko: string; lat: number | null; lng: number | null; memoryCount?: number };

// 네이버 지도 SDK에서 쓰는 부분만 타입으로
type LatLng = unknown;
type NaverMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => { fitBounds(b: unknown, m?: unknown): void };
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

export function NaverMap({ places, onSelect, className, height = "min(70vh, 480px)", square }: { places: MapPlace[]; onSelect?: (slug: string) => void; className?: string; height?: string; square?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(CLIENT_ID ? null : "지도 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 없어요");

  useEffect(() => {
    if (!CLIENT_ID || !el.current) return;
    window.navermap_authFailure = () => setError("지도 인증에 실패했어요. 네이버 콘솔의 웹 서비스 URL을 확인해 주세요");
    const pts = places.filter((p) => p.lat != null && p.lng != null);
    loadSdk()
      .then((maps) => {
        const center = pts[0] ? new maps.LatLng(pts[0].lat!, pts[0].lng!) : new maps.LatLng(37.5791, 126.9368);
        const map = new maps.Map(el.current!, { center, zoom: 14 });
        if (pts.length > 1) {
          const b = new maps.LatLngBounds(center, center);
          pts.forEach((p) => b.extend(new maps.LatLng(p.lat!, p.lng!)));
          // 핀 이름표가 마커 위 가운데에 붙어서, 좌우 여백이 좁으면 양 끝 이름표가 잘림
          map.fitBounds(b, { top: 170, right: 70, bottom: 110, left: 70 });
        }
        pts.forEach((p) => {
          const m = new maps.Marker({
            position: new maps.LatLng(p.lat!, p.lng!),
            map,
            title: p.name_ko,
            icon: { content: pin(p.name_ko, characterFor(p.slug)) },
          });
          if (onSelect) maps.Event.addListener(m, "click", () => onSelect(p.slug));
        });
      })
      .catch((e: Error) => setError(e.message));
  }, [places, onSelect]);

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
