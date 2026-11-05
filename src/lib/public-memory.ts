// 공개용(익명화·번역) 기억 만들기 어댑터 — POST /api/memories 가 이 파일만 바라본다.
//
// public_anonymous 저장 때마다 AI 익명화 호출이 한 번 일어난다.
//
//    시그니처 (src/lib/memory-ai.ts 에서 확인):
//      anonymizeMemory(content: string)
//        => Promise<{ anonText: string; translations: Record<string, string>; mocked: boolean }>
//      - anonText: 이름·전화번호·학교 등 식별 정보를 지우고 마음만 남긴 한 줄
//      - translations: { ko, en, ja, zh }
//      - 언어·장소 이름은 받지 않는다 (원문 한 개만 넘김)
//      - 키가 없거나 호출이 실패하면 mock 문구("이 자리에 남겨진 소중한 기억")가 온다.
//        mocked 가 true 여도 원문은 들어 있지 않으므로 공개해도 안전하다.
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
  const { anonymizeMemory } = await import("@/lib/memory-ai");
  const r = await anonymizeMemory(input.content);
  return r?.anonText?.trim() ? { anonText: r.anonText.trim(), translations: r.translations ?? {} } : null;
}
