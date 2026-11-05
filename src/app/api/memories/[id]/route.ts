// DELETE /api/memories/:id — 고리 풀기(삭제). 내가 남긴 고리만, 그 장소 반경 안에서만 (Figma 삭제 플로우)
// body: { deviceId, lat, lng, demo? } → { deleted: true } | { deleted: false, lockedReason, distance? }
// 편지·사진·재방문 기록·기억 벽 한 줄은 DB cascade로 같이 지워짐
import { NextResponse } from "next/server";
import { db, getUserByDevice } from "@/lib/db";
import { distanceM } from "@/lib/client";

export const runtime = "nodejs";

type Row = { id: string; user_id: string; places: { name_ko: string; lat: number | null; lng: number | null; radius_m: number } };
const isCoord = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { deviceId, lat, lng, demo } = (await req.json().catch(() => ({}))) as { deviceId?: string; lat?: number; lng?: number; demo?: boolean };
    if (!deviceId) return NextResponse.json({ error: "로그인이 필요해요" }, { status: 401 });

    const [user, rows] = await Promise.all([
      getUserByDevice(deviceId),
      db<Row[]>(`memories?id=eq.${encodeURIComponent(id)}&select=id,user_id,places(name_ko,lat,lng,radius_m)`),
    ]);
    const m = rows[0];
    if (!m) return NextResponse.json({ error: "없는 고리예요" }, { status: 404 });
    if (!user || m.user_id !== user.id) return NextResponse.json({ error: "내가 남긴 고리만 풀 수 있어요" }, { status: 403 });

    // ponytail: demo 플래그는 revisit과 같은 발표용 우회 — 정식 서비스에선 서버에서 막을 것
    const pl = m.places;
    if (!demo && pl.lat != null && pl.lng != null) {
      if (!isCoord(lat, 90) || !isCoord(lng, 180)) return NextResponse.json({ deleted: false, lockedReason: "위치 권한을 허용해야 고리를 풀 수 있어요" });
      const distance = Math.round(distanceM({ lat, lng }, { lat: pl.lat, lng: pl.lng }));
      if (distance > pl.radius_m)
        return NextResponse.json({ deleted: false, distance, lockedReason: `${pl.name_ko}에서 ${distance}m 떨어져 있어요. ${pl.radius_m}m 안에서 다시 시도해 주세요` });
    }

    // 이 기억에 덧붙인 '한 겹 더' 기억은 남기고 연결만 끊음
    await db(`memories?parent_memory_id=eq.${m.id}`, { method: "PATCH", prefer: "return=minimal", body: { parent_memory_id: null } });
    await db(`memories?id=eq.${m.id}`, { method: "DELETE", prefer: "return=minimal" });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "고리를 풀지 못했어요" }, { status: 500 });
  }
}
