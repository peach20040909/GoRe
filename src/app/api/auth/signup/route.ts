// POST /api/auth/signup — 이메일 + 비밀번호 가입 (docs/API.md 9-1)
// 가입하면 users.device_id 에 추측 불가능한 토큰(randomUUID)을 넣고, 그 값을 token 으로 돌려준다.
// → 브라우저가 token 을 ms_device_id 로 저장하면 deviceId 를 받는 기존 API 가 그대로 동작한다.
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword, isEmailConflict, parseEmail, PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth";
import { db, normalizeLanguage } from "@/lib/db";
import { HttpError, optionalString, readJsonBody, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

const EMAIL_TAKEN = () => new HttpError(409, "이미 가입된 이메일이에요");

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);

    // ── 입력 검증 (DB 건드리기 전) ──
    const email = parseEmail(body.email);
    if (!email) throw new HttpError(400, "이메일 형식이 올바르지 않아요");

    const password = body.password;
    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
      throw new HttpError(400, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`);
    }
    if (password.length > PASSWORD_MAX) throw new HttpError(400, `비밀번호는 ${PASSWORD_MAX}자 이하로 해 주세요`);

    const nickname = optionalString(body, "nickname")?.trim().slice(0, 40) ?? null;
    const language = normalizeLanguage(body.language);

    // ── 이미 가입된 이메일이면 해시 계산 전에 거절 ──
    const existing = await db<{ id: string }[]>(`/users?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
    if (existing?.[0]) throw EMAIL_TAKEN();

    // ── 저장 ──
    const token = randomUUID();
    const passwordHash = await hashPassword(password);
    let rows: { id: string; email: string; nickname: string | null }[] | null;
    try {
      rows = await db(`/users?select=id,email,nickname`, {
        method: "POST",
        prefer: "return=representation",
        body: { device_id: token, email, password_hash: passwordHash, nickname, language },
      });
    } catch (e) {
      // 위 확인과 insert 사이에 같은 이메일이 먼저 들어온 경쟁 상황 → unique 충돌도 409
      if (isEmailConflict(e)) throw EMAIL_TAKEN();
      throw e;
    }
    const user = rows?.[0];
    if (!user) throw new HttpError(502, "가입하지 못했어요. 다시 시도해 주세요.");

    return NextResponse.json(
      { token, user: { id: user.id, email: user.email, nickname: user.nickname } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return toErrorResponse(e, "POST /api/auth/signup");
  }
}
