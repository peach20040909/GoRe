"use client";
// 홈 화면 지도: 네이버 지도(Dynamic Map)에 장소 핀 + "기억 N개" 표시.
// 필요: NEXT_PUBLIC_NAVER_MAP_CLIENT_ID, 네이버 콘솔 '웹 서비스 URL'에 접속 주소 등록 (localhost:3000, go-re.vercel.app)
import { useEffect, useRef, useState } from "react";
import { characterFor } from "@/lib/media";
import { useLanguage } from "@/components/LanguageProvider";

export type MapPlace = { slug: string; name_ko: string; lat: number | null; lng: number | null; memoryCount?: number };

// 네이버 지도 SDK에서 쓰는 부분만 타입으로
type LatLng = unknown;
type NaverMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => { fitBounds(b: unknown, m?: unknown): void; destroy?(): void };
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new (a: LatLng, b: LatLng) => { extend(p: LatLng): void };
  Marker: new (opts: Record<string, unknown>) => { setPosition(p: LatLng): void; setMap(m: unknown): void };
  Event: { addListener(target: unknown, name: string, fn: () => void): void };
};
declare global {
  interface Window {
    naver?: { maps: NaverMaps };
    navermap_authFailure?: () => void;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

// 내 위치: 흰 테두리 빨간 점 + 퍼지는 고리 (위치 권한을 허용했을 때만)
const ME_DOT = `<div style="transform:translate(-50%,-50%);position:relative;width:18px;height:18px;pointer-events:none">
  <span style="position:absolute;inset:-9px;border-radius:999px;background:rgba(229,57,53,.25);animation:gore-me 1.8s ease-out infinite"></span>
  <span style="position:absolute;inset:0;border-radius:999px;background:#e53935;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>
  <style>@keyframes gore-me{0%{transform:scale(.5);opacity:1}100%{transform:scale(1.6);opacity:0}}</style></div>`;
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
const pin = (name: string, img: string, labelAbove = false) =>
  `<div style="transform:translate(-50%,-72px);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer">
    <div style="position:relative;width:56px;height:72px">
      <img src="/ds/pin.svg" width="56" height="72" style="position:absolute;inset:0" alt="">
      <div style="position:absolute;left:6px;top:5px;width:44px;height:44px;border-radius:999px;overflow:hidden;background:#f5f0e9;display:flex;justify-content:center">
        <img src="${img}" style="height:46px;margin-top:3px" alt=""></div></div>
    <div style="${labelAbove ? "position:absolute;bottom:calc(100% + 6px);" : ""}background:#fff;border-radius:8px;padding:5px 9px;font:500 12px/17px Pretendard,system-ui;color:#171717;white-space:nowrap;box-shadow:0 4px 8px rgba(0,0,0,.08)">${name}</div></div>`;

type Props = {
  places: MapPlace[];
  onSelect?: (slug: string) => void;
  onMapClick?: () => void; // 핀이 아닌 빈 지도를 눌렀을 때 (홈: 바텀시트 내리기)
  bottomInset?: number; // 지도 아래를 덮는 시트 높이. 바뀌면 핀이 보이는 영역에 오도록 다시 맞춤
  className?: string;
  height?: string;
  square?: boolean;
  compact?: boolean;
  showMe?: boolean; // 내 위치를 빨간 점으로 표시
};

export function NaverMap({ places, onSelect, onMapClick, bottomInset = 0, className, height = "min(70vh, 480px)", square, compact = false, showMe = false }: Props) {
  const { t } = useLanguage();
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
    let watchId: number | null = null;
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
            title: t(p.name_ko),
            icon: { content: pin(t(p.name_ko), characterFor(p.slug), p.slug === "hongje-falls") },
          });
          maps.Event.addListener(m, "click", () => {
            markerAt = Date.now();
            onSelect?.(p.slug);
          });
        });
        // 내 위치 빨간 점: 권한을 허용하면 표시하고 움직이면 따라감. 거부·실패면 조용히 안 보임
        if (showMe && navigator.geolocation) {
          let me: InstanceType<NaverMaps["Marker"]> | null = null;
          watchId = navigator.geolocation.watchPosition(
            ({ coords }) => {
              if (disposed || !map) return;
              const at = new maps.LatLng(coords.latitude, coords.longitude);
              if (me) me.setPosition(at);
              else me = new maps.Marker({ position: at, map, zIndex: 200, clickable: false, icon: { content: ME_DOT } });
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
          );
        }
      })
      .catch(() => setError("지도를 불러오지 못했어요")); // SDK 내부 오류 문구(영어)는 사용자에게 보이지 않게
    return () => {
      disposed = true;
      fit.current = null;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      // 인증 실패(등록 안 된 주소·미리보기 배포)한 지도는 destroy가 SDK 안에서 터져 화면 전체가 죽어서 막아 둠
      try {
        map?.destroy?.();
      } catch {
        /* 무시: 지도만 정리 못 한 것 */
      }
    };
  }, [places, onSelect, compact, t, showMe]);

  useEffect(() => fit.current?.(bottomInset), [bottomInset]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height, borderRadius: square ? 0 : 16, overflow: "hidden", background: "#f5f5f5" }}>
      <div ref={el} style={{ position: "absolute", inset: 0 }} />
      {error && (
        <p style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", color: "#6b6f76", fontSize: 14 }}>
          {t(error)}
        </p>
      )}
    </div>
  );
}
