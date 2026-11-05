// GET /api/auth/me?token= — 내 정보 + 기억 개수 (docs/API.md 9-3)
// 토큰이 없거나, 모르는 토큰이거나, 이메일이 없는 행(익명 deviceId)이면 401.
// 주의: 토큰이 쿼리스트링으로 온다. 이 코드는 URL/토큰을 로그에 남기지 않는다.
import { NextResponse } from "next/server";
import { getAuthUserByToken } from "@/lib/auth";
import { dbCount } from "@/lib/db";
import { HttpError, toErrorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const user = await getAuthUserByToken(new URL(req.url).searchParams.get("token"));
    if (!user) throw new HttpError(401, "로그인이 필요해요");

    const memoryCount = await dbCount(`/memories?user_id=eq.${user.id}`);
    return NextResponse.json(
      { user: { id: user.id, email: user.email, nickname: user.nickname, language: user.language }, memoryCount },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return toErrorResponse(e, "GET /api/auth/me");
  }
}
