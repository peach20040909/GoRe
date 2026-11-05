// 회원가입·로그인 공통 (★ 서버 전용: API 라우트에서만 import) — docs/API.md 9장
// - 비밀번호는 node:crypto scrypt 로만 해시 (라이브러리 없음)
// - 비밀번호 원문·해시는 응답과 로그에 절대 넣지 않는다
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, isUuid } from "./db";
import { HttpError } from "./http";

const scrypt = promisify(scryptCb) as unknown as (password: string, salt: string, keylen: number) => Promise<Buffer>;

const KEY_LEN = 64;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128; // 터무니없이 긴 입력으로 서버를 느리게 만들지 못하게

/* ───────────────────────── 비밀번호 ───────────────────────── */

/** 저장 형식: salt(16바이트 hex) + ":" + scrypt(password, salt, 64) 의 hex */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, KEY_LEN);
  return `${salt}:${hash.toString("hex")}`;
}

const HASH_RE = /^([0-9a-f]{32}):([0-9a-f]{128})$/;
/** 없는 이메일에도 같은 비용의 scrypt 비교를 하기 위한 더미 (절대 일치하지 않음) */
const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(KEY_LEN * 2)}`;

/**
 * 저장된 해시와 비교 (timingSafeEqual).
 * stored 가 없거나 형식이 깨졌으면 더미와 비교해서 시간 차이를 줄이고 항상 false.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  const real = stored ? HASH_RE.exec(stored) : null;
  const m = real ?? HASH_RE.exec(DUMMY_HASH)!;
  const expected = Buffer.from(m[2], "hex");
  const actual = await scrypt(password, m[1], KEY_LEN);
  const same = actual.length === expected.length && timingSafeEqual(actual, expected);
  return real !== null && same;
}

/* ───────────────────────── 이메일 ───────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** trim + 소문자. 형식이 틀리면 null */
export function parseEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const email = v.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

/* ───────────────────────── 토큰 → 유저 ───────────────────────── */

export type AuthUser = { id: string; email: string; nickname: string | null; language: string };

/**
 * 토큰(= users.device_id)으로 가입한 유저를 찾는다.
 * 토큰 형식이 아니거나, 없거나, 이메일이 없는 행(익명 deviceId)이면 null.
 * select 는 컬럼을 명시한다 (password_hash 를 읽지 않음).
 */
export async function getAuthUserByToken(token: unknown): Promise<AuthUser | null> {
  if (!isUuid(token)) return null;
  const rows = await db<{ id: string; email: string | null; nickname: string | null; language: string }[]>(
    `/users?device_id=eq.${token}&select=id,email,nickname,language&limit=1`,
  );
  const u = rows?.[0];
  if (!u || !u.email) return null;
  return { id: u.id, email: u.email, nickname: u.nickname, language: u.language };
}

/** users.email unique 충돌(23505)인지. 로그에는 아무것도 남기지 않고 호출부가 409 로 바꾼다. */
export function isEmailConflict(e: unknown): boolean {
  return e instanceof HttpError && /23505/.test(e.detail ?? "") && /email/.test(e.detail ?? "");
}
