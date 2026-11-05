// 꺼내기: 다시 방문 → 같은 자리 판정 → 열림 + 재회 리포트
import { NextResponse } from "next/server";
import { db, getUserByDevice, uploadPhoto } from "@/lib/db";
import { judgeRevisit } from "@/lib/memory-ai";
import { distanceM } from "@/lib/client";

export const runtime = "nodejs";
export const maxDuration = 60;

type MemoryRow = {
  id: string;
  user_id: string;
  content: string;
  photo_url: string | null;
  language: string;
  unlock_type: "date" | "season" | "revisit" | "together";
  unlock_at: string | null;
  status: "locked" | "opened";
  created_at: string;
  places: { name_ko: string; description: string; lat: number | null; lng: number | null; radius_m: number };
};

const isCoord = (v: unknown, max: number): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= max;

const SAME_SPOT_MIN = 0.5; // 판정 기준을 너그럽게 (기획서 13. 리스크)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { deviceId, photoDataUrl, lat, lng, demo } = (await req.json()) as {
      deviceId?: string;
      photoDataUrl?: string;
      lat?: number;
      lng?: number;
      demo?: boolean;
    };
    if (!deviceId || !photoDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "기기 정보와 지금 찍은 사진이 필요해요" }, { status: 400 });
    }

    const [user, rows] = await Promise.all([
      getUserByDevice(deviceId),
      db<MemoryRow[]>(`memories?id=eq.${encodeURIComponent(id)}&select=*,places(name_ko,description,lat,lng,radius_m)`),
    ]);
    const memory = rows[0];
    if (!memory) return NextResponse.json({ error: "없는 기억이에요" }, { status: 404 });
    if (!user || memory.user_id !== user.id) {
      return NextResponse.json({ error: "내가 남긴 기억만 열 수 있어요" }, { status: 403 });
    }
    if (memory.status === "opened") {
      return NextResponse.json({ opened: true, alreadyOpened: true, memory });
    }

    // 날짜·계절형은 그날이 지나야 열림. demo는 발표용 '시간 넘기기'
    // ponytail: demo 플래그를 누구나 보낼 수 있음 — 정식 서비스에선 서버 환경변수로 막을 것
    if ((memory.unlock_type === "date" || memory.unlock_type === "season") && memory.unlock_at && !demo) {
      const at = new Date(memory.unlock_at);
      if (at > new Date()) {
        return NextResponse.json({
          opened: false,
          sameSpot: null,
          lockedReason: `${at.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}부터 열려요`,
        });
      }
    }

    // 위치: 장소 고정 좌표 반경 안에서만 사진 판정으로 넘어감 (기획서 6-2 A: 사진 판정 + GPS). demo는 발표장용으로 건너뜀
    const pl = memory.places;
    if (!demo && pl.lat != null && pl.lng != null) {
      if (!isCoord(lat, 90) || !isCoord(lng, 180)) {
        return NextResponse.json({ opened: false, sameSpot: null, lockedReason: "위치 권한을 허용해야 기억을 열 수 있어요" });
      }
      const distance = Math.round(distanceM({ lat, lng }, { lat: pl.lat, lng: pl.lng }));
      if (distance > pl.radius_m) {
        return NextResponse.json({
          opened: false,
          sameSpot: null,
          distance,
          lockedReason: `${pl.name_ko}에서 ${distance}m 떨어져 있어요. ${pl.radius_m}m 안으로 와서 다시 찍어 주세요`,
        });
      }
    }

    const [judge, newPhotoUrl] = await Promise.all([
      judgeRevisit({
        newPhotoDataUrl: photoDataUrl,
        originalPhotoUrl: memory.photo_url,
        placeName: memory.places.name_ko,
        placeDescription: memory.places.description,
        language: memory.language,
        content: memory.content,
        lockedAt: memory.created_at.slice(0, 10),
      }),
      uploadPhoto(photoDataUrl).catch(() => null), // 기록용, 실패해도 판정은 진행
    ]);
    const opened = judge.sameSpot && judge.confidence >= SAME_SPOT_MIN;

    await db("revisits", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        memory_id: memory.id,
        photo_url: newPhotoUrl,
        lat: lat ?? null,
        lng: lng ?? null,
        same_spot: opened,
        confidence: judge.confidence,
        reason: judge.reason,
        reunion_report: opened ? judge.reunionReport : null,
      },
    });

    if (!opened) {
      return NextResponse.json({
        opened: false,
        sameSpot: false,
        confidence: judge.confidence,
        reason: judge.reason,
        lockedReason: "처음 맡긴 그 자리에서 다시 찍어 주세요",
        mocked: judge.mocked,
      });
    }

    const [updated] = await db<MemoryRow[]>(`memories?id=eq.${memory.id}`, {
      method: "PATCH",
      body: { status: "opened", opened_at: new Date().toISOString() },
    });
    return NextResponse.json({
      opened: true,
      sameSpot: true,
      confidence: judge.confidence,
      reason: judge.reason,
      reunionReport: judge.reunionReport,
      memory: updated,
      mocked: judge.mocked,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "기억을 열지 못했어요" }, { status: 500 });
  }
}
