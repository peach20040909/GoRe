// 공개용(익명화·번역) 기억 만들기 어댑터 — POST /api/memories 가 이 파일만 바라본다.
//
// ★ TODO(AI 담당의 src/lib/memory-ai.ts 가 머지되면):
//    아래 "연결 지점" 주석 3줄을 풀고 `return null;` 한 줄을 지우면 끝.
//    memory-ai.ts 가 아직 없는 지금 정적 import 를 쓰면 빌드가 깨지므로 일부러 막아 둠.
//
//    기대하는 시그니처 (다르면 이 파일에서만 맞춰 주면 됨):
//      anonymizeMemory(input: { content: string; language: string; placeName: string })
//        => Promise<{ anonText: string; translations: Record<string, string> }>
//      - anonText: 이름·전화번호·학교 등 식별 정보를 지우고 마음만 남긴 한 줄
//      - translations: { ko, en, ja, zh }
//
// 안전 규칙: 익명화 결과가 없으면 null → 공개 안 함. 원문을 대신 공개하는 폴백은 절대 두지 않는다.

export type PublicVersion = {
  anonText: string;
  translations: Record<string, string>;
};

export type PublicVersionInput = {
  content: string; // 원문 (서버에서만 다룸)
  language: string;
  placeName: string;
};

/** 공개 가능한 익명 버전을 만든다. 만들 수 없으면 null (그 기억은 비공개로만 저장됨). */
export async function makePublicVersion(input: PublicVersionInput): Promise<PublicVersion | null> {
  void input;

  // ── 연결 지점 (memory-ai.ts 머지 후 주석 해제) ──────────────────────────
  // const { anonymizeMemory } = await import("@/lib/memory-ai");
  // const r = await anonymizeMemory(input);
  // return r?.anonText?.trim() ? { anonText: r.anonText.trim(), translations: r.translations ?? {} } : null;
  // ─────────────────────────────────────────────────────────────────────

  return null;
}
