// API 라우트 공통 헬퍼 (서버 전용): 에러 클래스, 에러 응답 변환, JSON 본문 파싱.
// 에러 응답 규칙(docs/API.md): { "error": "사람이 읽을 메시지" } + 4xx/5xx
import { NextResponse } from "next/server";

/** 상태코드를 가진 에러. 메시지는 그대로 사용자에게 내려가므로 비밀값을 넣지 말 것. */
export class HttpError extends Error {
  /** 서버 로그에만 남기는 상세 내용 (응답에는 포함하지 않음) */
  detail?: string;
  constructor(
    public status: number,
    message: string,
    detail?: string,
  ) {
    super(message);
    this.name = "HttpError";
    this.detail = detail;
  }
}

/** catch 블록에서 그대로 `return toErrorResponse(e, "POST /api/memories")` */
export function toErrorResponse(e: unknown, context = "api"): NextResponse {
  if (e instanceof HttpError) {
    if (e.status >= 500) console.error(`[${context}]`, e.detail ?? e.message);
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(`[${context}]`, e);
  return NextResponse.json({ error: "서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}

/** 요청 본문을 JSON 객체로 파싱. 아니면 400. */
export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "요청 본문이 올바른 JSON이 아니에요");
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "요청 본문은 JSON 객체여야 해요");
  }
  return body as Record<string, unknown>;
}

/** 필수 문자열 필드 꺼내기 (공백만 있으면 없는 것으로 취급) */
export function requireString(body: Record<string, unknown>, key: string): string {
  const v = body[key];
  if (typeof v !== "string" || v.trim() === "") throw new HttpError(400, `${key} 값이 필요해요`);
  return v;
}

/** 선택 문자열 필드: 비어 있거나 문자열이 아니면 null */
export function optionalString(body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
