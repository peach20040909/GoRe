// 브라우저에서 쓰는 공통 도구. 화면 디자인과 상관없이 모든 페이지가 공유.
import { preferredLanguage } from "./language";

export type LatLng = { lat: number; lng: number };
export type PlaceLite = { slug: string; name_ko: string; name_en: string; lat: number | null; lng: number | null; radius_m: number };

/** 로그인 없이 기기를 구분하는 ID. 처음 한 번 만들고 계속 재사용 */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem("ms_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ms_device_id", id);
    }
    return id;
  } catch {
    return "anonymous-" + Math.random().toString(36).slice(2); // 사생활 보호 모드 등에서 저장이 막힌 경우
  }
}

/** 브라우저 언어 → 서비스 언어 코드 */
export function browserLanguage(): string {
  return preferredLanguage();
}

/** 폰 사진은 Vercel 요청 한도(4.5MB)를 넘기 쉬움 → 긴 변 1280px JPEG data URL로 줄임 */
export function resizeImage(file: File, max = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 읽지 못했어요"));
    };
    img.src = url;
  });
}

/** 현재 위치. 권한 거부·실패·시간 초과면 null (카메라 판정으로 넘어가면 됨) */
export function getPosition(timeoutMs = 8000): Promise<LatLng | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 }
    );
  });
}

/** 두 좌표 사이 거리(m), 하버사인 공식 */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** a에서 b로 가는 방향(0=북, 90=동) */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export const compassKo = (deg: number) => ["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round(deg / 45) % 8];

/** 반경 안의 장소들을 가까운 순으로. 좌표가 아직 없는 장소는 제외 */
export function placesNearby<T extends PlaceLite>(places: T[], pos: LatLng): (T & { distance: number })[] {
  return places
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ ...p, distance: distanceM(pos, { lat: p.lat!, lng: p.lng! }) }))
    .filter((p) => p.distance <= p.radius_m)
    .sort((a, b) => a.distance - b.distance);
}

/** JSON API 호출. 실패하면 서버가 준 한국어 메시지로 throw → 화면에서 그대로 보여주면 됨 */
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "잠시 후 다시 시도해 주세요");
  return data as T;
}
