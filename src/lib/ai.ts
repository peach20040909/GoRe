// LLM 호출을 한 곳에 모은 모듈. SDK 없이 fetch만 사용 → 의존성/버전 문제 없음.
// 키가 없거나 호출이 실패하면 mock으로 떨어져서 시연이 멈추지 않게 함.

export type AiInput = {
  system: string;
  prompt: string;
  json?: boolean; // true면 JSON 객체만 반환하도록 요청
  imageDataUrl?: string; // "data:image/png;base64,..." (선택)
  images?: string[]; // 여러 장: data URL 또는 https URL (사진 비교용)
  maxTokens?: number;
};

function allImages(i: AiInput) {
  return [...(i.images ?? []), ...(i.imageDataUrl ? [i.imageDataUrl] : [])];
}

export type AiOutput = { text: string; provider: string; mocked: boolean };

type Provider = "anthropic" | "openai" | "mock";

function pickProvider(): Provider {
  const forced = process.env.AI_PROVIDER?.trim() as Provider | undefined;
  if (forced) return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

function splitDataUrl(dataUrl: string) {
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) throw new Error("잘못된 이미지 형식");
  return { mediaType: m[1], data: m[2] };
}

async function callAnthropic(i: AiInput): Promise<string> {
  const content: unknown[] = allImages(i).map((img) => {
    if (img.startsWith("http")) return { type: "image", source: { type: "url", url: img } };
    const { mediaType, data } = splitDataUrl(img);
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  });
  content.push({ type: "text", text: i.prompt });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: i.maxTokens ?? 4000,
      // 판정·정리 위주라 깊게 생각할 필요 없음 → 시연 속도 우선
      output_config: { effort: "low" },
      fallbacks: "default", // 안전 분류기가 거절하면 서버가 다른 모델로 자동 재시도
      system: i.json ? `${i.system}\n\n반드시 유효한 JSON 객체 하나만 출력하라. 코드블록, 설명 금지.` : i.system,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("Anthropic refusal");
  return data.content?.map((c: { type: string; text?: string }) => (c.type === "text" ? c.text ?? "" : "")).join("") ?? "";
}

async function callOpenAI(i: AiInput): Promise<string> {
  const userContent: unknown[] = [{ type: "text", text: i.prompt }];
  for (const url of allImages(i)) userContent.push({ type: "image_url", image_url: { url } });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: i.maxTokens ?? 2000,
      ...(i.json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: i.json ? `${i.system}\n\nJSON 객체 하나만 출력하라.` : i.system },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function mock(i: AiInput): string {
  if (!i.json) return `(MOCK) "${i.prompt.slice(0, 40)}"에 대한 예시 응답입니다. API 키를 넣으면 실제 AI 응답으로 바뀝니다.`;
  return JSON.stringify({
    title: "예시 분석 결과",
    summary: "API 키가 없어서 MOCK 데이터가 표시되고 있어요. .env.local에 키를 넣으면 실제 결과가 나옵니다.",
    items: [
      { title: "핵심 포인트 1", description: "입력 내용을 바탕으로 한 첫 번째 제안", tag: "추천", score: 92 },
      { title: "핵심 포인트 2", description: "두 번째 제안 — 실행 난이도가 낮음", tag: "빠른 실행", score: 81 },
      { title: "핵심 포인트 3", description: "세 번째 제안 — 장기적으로 효과가 큼", tag: "장기", score: 74 },
    ],
  });
}

export async function generate(i: AiInput): Promise<AiOutput> {
  const provider = pickProvider();
  try {
    if (provider === "anthropic") return { text: await callAnthropic(i), provider, mocked: false };
    if (provider === "openai") return { text: await callOpenAI(i), provider, mocked: false };
  } catch (e) {
    console.error("[ai] 실제 호출 실패 → mock으로 대체:", e);
  }
  return { text: mock(i), provider: "mock", mocked: true };
}

/** 모델이 ```json 코드블록 등을 섞어 보내도 JSON만 뽑아냄 */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned) as T;
}
