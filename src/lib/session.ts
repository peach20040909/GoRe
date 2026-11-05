// 로그인 세션 (브라우저 전용). 토큰 = users.device_id 라서 기존 API의 deviceId 자리에 그대로 넣는다.
export type SessionUser = { id: string; email: string; nickname: string | null };

const TOKEN = "ms_device_id";
const USER = "ms_user";
const DEMO = "ms_demo";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // 사생활 보호 모드 등에서 저장소가 막힌 경우
  }
}

export const getToken = () => safe(() => localStorage.getItem(TOKEN), null);
export const getUser = (): SessionUser | null => safe(() => JSON.parse(localStorage.getItem(USER) ?? "null"), null);

export function setSession(token: string, user: SessionUser) {
  safe(() => {
    localStorage.setItem(TOKEN, token);
    localStorage.setItem(USER, JSON.stringify(user));
  }, undefined);
}

export function clearSession() {
  safe(() => {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
  }, undefined);
}

/** 시연 모드: 주소에 ?demo=1 을 한 번 붙여 열면 이 탭이 닫힐 때까지 위치·날짜 확인을 건너뜀 */
export function isDemo(): boolean {
  return safe(() => {
    if (new URLSearchParams(location.search).get("demo") === "1") sessionStorage.setItem(DEMO, "1");
    return sessionStorage.getItem(DEMO) === "1";
  }, false);
}
