// Supabase REST(PostgREST·Storage)를 fetch로 호출. 서버(API 라우트) 전용 — 브라우저에서 import 금지.
// 사용법: db<Row[]>("places?select=*") / db("memories", { method: "POST", body: {...} })

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra: Record<string, string> = {}) {
  if (!URL || !KEY) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않았어요");
  return { apikey: KEY, authorization: `Bearer ${KEY}`, ...extra };
}

export async function db<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; prefer?: string } = {}
): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method: opts.method ?? "GET",
    headers: headers({ "content-type": "application/json", prefer: opts.prefer ?? "return=representation" }),
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`DB ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** data URL 사진을 photos 버킷에 올리고 공개 URL을 돌려줌 */
export async function uploadPhoto(dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) throw new Error("사진 형식이 올바르지 않아요");
  const name = `${crypto.randomUUID()}.${m[1] === "image/png" ? "png" : "jpg"}`;
  const res = await fetch(`${URL}/storage/v1/object/photos/${name}`, {
    method: "POST",
    headers: headers({ "content-type": m[1] }),
    body: Buffer.from(m[2], "base64"),
  });
  if (!res.ok) throw new Error(`Storage ${res.status}: ${await res.text()}`);
  return `${URL}/storage/v1/object/public/photos/${name}`;
}

export type User = { id: string; device_id: string; nickname: string | null; language: string };

export type Place = {
  id: string;
  slug: string;
  name_ko: string;
  name_en: string;
  lat: number | null;
  lng: number | null;
  radius_m: number;
  description: string;
};

export async function upsertUser(deviceId: string, nickname?: string, language?: string): Promise<User> {
  const body: Record<string, string> = { device_id: deviceId };
  if (nickname) body.nickname = nickname;
  if (language) body.language = language;
  const rows = await db<User[]>("users?on_conflict=device_id", {
    method: "POST",
    body,
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return rows[0];
}

export async function getUserByDevice(deviceId: string): Promise<User | null> {
  const rows = await db<User[]>(`users?device_id=eq.${encodeURIComponent(deviceId)}&select=*`);
  return rows[0] ?? null;
}

export async function getPlace(slug: string): Promise<Place | null> {
  const rows = await db<Place[]>(`places?slug=eq.${encodeURIComponent(slug)}&select=*`);
  return rows[0] ?? null;
}
