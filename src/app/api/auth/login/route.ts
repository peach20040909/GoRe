// POST /api/auth/login — 이메일 + 비밀번호 로그인 (docs/API.md 9-2)
// 이메일이 없든 비밀번호가 틀리든 같은 401. 없는 이메일에도 더미 scrypt 비교를 해서 응답 시간 차이를 줄인다.
import { NextResponse } from "next/server";
import { parseEmail, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, readJsonBody, requireString, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

const BAD_LOGIN = () => new HttpError(401, "이메일 또는 비밀번호를 확인해 주세요");

type LoginRow = { id: string; device_id: string; email: string; nickname: string | null; password_hash: string | null };

export async function POST(req: Request) {
  try {
    const body = await readJsonBody(req);
    requireString(body, "email");
    const password = requireString(body, "password");

    const email = parseEmail(body.email); // 형식이 이상해도 "어느 쪽이 틀렸는지" 알려주지 않는다
    let row: LoginRow | null = null;
    if (email) {
      // password_hash 는 여기서만 읽고, 응답에는 절대 싣지 않는다
      const rows = await db<LoginRow[]>(
        `/users?email=eq.${encodeURIComponent(email)}&select=id,device_id,email,nickname,password_hash&limit=1`,
      );
      row = rows?.[0] ?? null;
    }

    // row 가 없어도 항상 scrypt 한 번 (더미와 비교)
    const ok = await verifyPassword(password, row?.password_hash);
    if (!row || !ok) throw BAD_LOGIN();

    return NextResponse.json(
      { token: row.device_id, user: { id: row.id, email: row.email, nickname: row.nickname } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return toErrorResponse(e, "POST /api/auth/login");
  }
}
