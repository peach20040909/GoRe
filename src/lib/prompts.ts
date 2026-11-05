// ★ 주제 발표 후 제일 먼저 고치는 파일 ★
// 서비스의 "AI가 하는 일"을 여기서 정의. 화면은 ResultSchema 모양만 맞추면 그대로 렌더링됨.
import { z } from "zod";

export const SERVICE = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "MEMORY SEOUL",
  oneLiner: "서울의 문화 공간에 지금의 기억을 맡기고, 다시 와야 꺼낼 수 있는 AI 기록 서비스",
  inputLabel: "지금 상황을 알려주세요",
  inputPlaceholder: "예) 다음 주에 팀플 발표가 있는데 역할 분담이 안 돼서 고민이에요",
};

export const SYSTEM_PROMPT = `너는 대학생을 돕는 서비스의 AI 어시스턴트다.
사용자의 입력을 분석해서 바로 실행 가능한 제안을 한국어로 준다.
제안은 구체적이고 짧게. 과장하지 말 것.`;

export function buildPrompt(input: string) {
  return `사용자 입력:
"""
${input}
"""

아래 JSON 형식으로만 답하라:
{
  "title": "결과 제목 (20자 이내)",
  "summary": "한두 문장 요약",
  "items": [
    { "title": "제안 제목", "description": "구체적인 설명 1~2문장", "tag": "짧은 태그", "score": 0~100 사이 정수(적합도) }
  ]
}
items는 3~5개.`;
}

export const ResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        tag: z.string().optional(),
        score: z.number().optional(),
      })
    )
    .default([]),
});
export type Result = z.infer<typeof ResultSchema>;

// ───────────────────────── MEMORY SEOUL AI ─────────────────────────
// 각 프롬프트는 JSON 한 개만 받도록 설계. 응답은 아래 zod 스키마로 검증하고, 실패하면 memory-ai.ts가 예시 응답으로 대체.

const LANG_RULE = (lang: string) =>
  `사람이 읽는 문장은 모두 언어 코드 "${lang}"의 언어로 쓴다 (ko=한국어, en=English, ja=日本語, zh=中文 등).`;

export const FORTUNES = ["love", "wealth", "success", "health", "family", "bonds", "reunion", "fresh", "own"] as const;

// A. 장소 인증 — 사진이 어느 장소인지
export function identifyPrompt(places: { slug: string; name: string; description: string }[]) {
  return {
    system: "너는 서울 문화 공간의 사진을 보고 어느 장소인지 판정하는 심사자다. 확실하지 않으면 확신도를 낮게 준다.",
    prompt: `후보 장소:
${places.map((p) => `- ${p.slug} (${p.name}): ${p.description}`).join("\n")}

첨부한 사진이 위 후보 중 어디인지 판정하라. 어느 곳도 아니면 slug는 null.
JSON: {"slug": "후보 slug 또는 null", "confidence": 0~1 숫자, "reason": "사진에서 본 근거 한 문장(한국어)"}`,
  };
}
export const IdentifySchema = z.object({
  slug: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

// B·C·D·E. 안전 필터 + 기억 이해 + 카드 디자인 값 + 열림 조건 제안 (호출 1번)
export function draftPrompt(input: { content: string; language: string; placeName: string; today: string; hasPhoto: boolean }) {
  return {
    system: `너는 여행자가 서울의 장소에 남긴 기억을 이해해 타임캡슐 카드로 정리하는 AI다. 대화하지 않고 JSON 하나만 낸다.
${LANG_RULE(input.language)} 단, engraving.ko는 항상 한국어.`,
    prompt: `장소: ${input.placeName}
오늘: ${input.today}
남긴 기억:
"""
${input.content}
"""
${input.hasPhoto ? "첨부 사진은 이 자리에서 방금 찍은 것이다. 하늘색·계절·풍경 실루엣을 카드 색과 문양에 반영하라." : "사진은 없다."}

규칙
- safe: 남을 해치려는 저주·혐오·불법·자해 내용이면 false (unsafeReason에 이유)
- recordType: wish(소원) | retro(회고) | letter(편지)
- fortune.main / fortune.sub: 소원형일 때만 ${FORTUNES.join(" | ")} 중에서, 아니면 null
- target: 기억이 향하는 사람. 연인·배우자와 함께였거나 연인을 위한 기억이면 partner, 가족이면 family, 친구면 friend, 멀리 있는 사람에게면 faraway, 그 외 self
- timeHint: 기억 속 시점 단서("다음 달 시험" 등)를 짧게, 없으면 null
- card.color: 사진의 하늘색 또는 기억의 분위기에서 직접 고른 hex 색 (기억마다 달라야 함)
- card.shape: 함께 온 사람이 있거나 target이 partner·family·friend면 pair, 아니면 single
- card.pattern: 이 장소와 기억에서 나온 문양 키워드 1~2단어, card.glow: 감정 강도 0~1
- engraving: 카드에 새길 짧은 한 줄 (mine=사용자 언어, ko=한국어), 20자 안팎
- unlockOptions: 반드시 2~3개. type은 date(그날이 되면) | season(다음 계절에) | revisit(이 자리에 다시 오면) | together(그 사람과 함께 와야). date·season은 unlockAt에 ISO 날짜(+09:00), 나머지는 null. timeHint가 있으면 그 시점에 맞춘 date 또는 season을 꼭 넣고, 함께 온 사람이 있으면 together를 넣는다. note는 사용자에게 보여줄 한 문장
- safe가 false여도 나머지 칸은 아래 형식대로 모두 채운다
- 아래 <...>는 자리표시다. 예시 값을 베끼지 말고 이 기억에 맞게 채운다

JSON:
{"safe": <true|false>, "unsafeReason": <문자열|null>, "recordType": <"wish"|"retro"|"letter">,
 "fortune": {"main": <운|null>, "sub": <운|null>},
 "target": <대상>, "emotion": <감정 한 단어>, "timeHint": <문자열|null>,
 "title": <카드 제목 20자 이내>, "keywords": [<키워드 2~4개>],
 "card": {"color": <"#RRGGBB">, "shape": <"single"|"pair">, "pattern": <문양 키워드>, "glow": <0~1>},
 "engraving": {"mine": <사용자 언어 한 줄>, "ko": <한국어 한 줄>},
 "unlockOptions": [{"type": <유형>, "unlockAt": <ISO 날짜|null>, "note": <한 문장>}]}`,
  };
}
// safe만 엄격하게 검사하고, 나머지 칸은 비거나 틀려도 기본값으로 메움
// (unsafe 응답이 형식 오류로 떨어져 '안전한 예시 응답'으로 바뀌는 일을 막음)
const UNLOCK_DEFAULT = [{ type: "revisit" as const, unlockAt: null, note: "이 자리에 다시 오면 열려요" }];
export const DraftSchema = z.object({
  safe: z.boolean(),
  unsafeReason: z.string().nullable().optional().catch(null),
  recordType: z.enum(["wish", "retro", "letter"]).catch("retro"),
  fortune: z
    .object({ main: z.enum(FORTUNES).nullable().catch(null), sub: z.enum(FORTUNES).nullable().catch(null) })
    .catch({ main: null, sub: null }),
  target: z.enum(["self", "partner", "family", "friend", "faraway"]).catch("self"),
  emotion: z.string().catch(""),
  timeHint: z.string().nullable().catch(null),
  title: z.string().catch("이 자리에 맡긴 기억"),
  keywords: z.array(z.string()).catch([]),
  card: z
    .object({
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).catch("#7FA7D9"),
      shape: z.enum(["single", "pair"]).catch("single"),
      pattern: z.string().catch("물결"),
      glow: z.number().min(0).max(1).catch(0.5),
    })
    .catch({ color: "#7FA7D9", shape: "single", pattern: "물결", glow: 0.5 }),
  engraving: z.object({ mine: z.string(), ko: z.string() }).catch({ mine: "", ko: "" }),
  unlockOptions: z
    .array(
      z.object({
        type: z.enum(["date", "season", "revisit", "together"]),
        unlockAt: z.string().nullable().catch(null),
        note: z.string(),
      })
    )
    .min(1)
    .catch(UNLOCK_DEFAULT),
});
export type Draft = z.infer<typeof DraftSchema>;

// F. 공개용 한 줄 — 익명화 + 번역 (원문은 공개하지 않음)
export function anonymizePrompt(content: string) {
  return {
    system: "너는 공개 기억 벽에 걸 문장을 만드는 편집자다. 개인을 알아볼 수 있는 정보를 모두 지우고 마음만 남긴다.",
    prompt: `원문:
"""
${content}
"""

규칙
- 이름, 연락처, 학교·회사명, 주소, 계정 등 식별 정보는 모두 지운다
- 원문을 그대로 옮기지 말고, 무엇을 바라거나 기억했는지 마음만 한 문장으로 (예: "엄마 ○○○ 수술 잘 되게" → "가족의 회복을 비는 기억")
- 혐오·저주 표현은 담지 않는다
- 4개 언어로 같은 뜻을 쓴다

JSON: {"anonText": "한국어 한 문장", "translations": {"ko": "...", "en": "...", "ja": "...", "zh": "..."}}`,
  };
}
export const AnonymizeSchema = z.object({
  anonText: z.string(),
  translations: z.record(z.string(), z.string()),
});

// 꺼내기. 같은 자리 판정 + 재회 리포트 (호출 1번)
export function revisitPrompt(input: {
  placeName: string;
  placeDescription: string;
  language: string;
  content: string;
  lockedAt: string;
  today: string;
  hasOriginal: boolean;
}) {
  return {
    system: `너는 타임캡슐을 여는 열쇠다. 다시 찾아온 사람이 처음 그 자리에 왔는지 사진으로 판정하고, 맞으면 그때와 지금을 잇는 짧은 재회 리포트를 쓴다.
판정은 너그럽게 하되(계절·날씨·밝기·사람이 달라도 같은 장소면 같은 자리), 전혀 다른 장소면 false.
단, 지금 사진에서 장소의 특징(건물·지형·사물)을 실제로 알아볼 수 없으면(빈 화면, 단색, 너무 어둡거나 흐림, 손가락으로 가림) 반드시 sameSpot=false, confidence 0.2 이하로 하고 reason에 다시 찍어 달라고 쓴다. 보이지 않는 것을 추측하지 않는다.
${LANG_RULE(input.language)}`,
    prompt: `장소: ${input.placeName} — ${input.placeDescription}
${input.hasOriginal ? "첫 번째 사진: 기억을 잠글 때 찍은 사진. 두 번째 사진: 지금 다시 와서 찍은 사진." : "첨부 사진: 지금 다시 와서 찍은 사진. 처음 사진이 없으니 위 장소 설명과 맞는지로 판정."}
잠근 날: ${input.lockedAt} / 오늘: ${input.today}
그때 남긴 기억:
"""
${input.content}
"""

JSON: {"sameSpot": true, "confidence": 0~1, "reason": "판정 근거 한 문장 (계절·풍경 변화가 보이면 언급)",
 "reunionReport": "sameSpot이 true일 때만 3~4문장: 그날 남긴 기억을 짚고, 그 사이 무엇이 달라졌는지 사진에서 본 변화를 말하고, 지금의 기억을 한 줄 더 남겨 보자고 권한다. false면 null"}`,
  };
}
export const RevisitSchema = z.object({
  sameSpot: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
  reunionReport: z.string().nullable(),
});
