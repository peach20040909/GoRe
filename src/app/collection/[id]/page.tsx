"use client";
// 05 배지 상세
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ds";
import { BADGES, badgeArt, earnedBadges } from "@/lib/badges";
import { loadMemories } from "@/lib/memories";
import { getToken } from "@/lib/session";

/* eslint-disable @next/next/no-img-element */
export default function BadgeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const badge = BADGES.find((b) => b.id === id);
  const [got, setGot] = useState<{ at: string; placeName: string } | null | undefined>(undefined);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then((m) => setGot(earnedBadges(m).get(id) ?? null)).catch(() => setGot(null));
  }, [router, id]);

  if (!badge)
    return (
      <div className="p-10 text-center">
        <p>배지를 찾을 수 없어요.</p>
        <Link href="/collection" className="btn mt-4 w-full">수집함으로</Link>
      </div>
    );

  const date = got && new Date(got.at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "").replace(/\.$/, "");
  const rows = [
    ["획득일", got ? date : "아직 획득 전이에요"],
    ["획득 장소", got ? got.placeName : badge.motif],
    ["획득 조건", "이 장소에 첫 고리 남기기"],
  ];

  return (
    <div className="min-h-dvh pb-8">
      <Header title="배지 상세" back="/collection" />
      <div className="px-6">
        <div className="relative mt-4 flex h-[248px] flex-col items-center rounded-3xl bg-canvas pt-6">
          <img src={badgeArt(badge.id)} alt={badge.name} width={176} height={176} className={got ? "" : "opacity-25"} />
          <span className="t-caption mt-1 rounded-full bg-surface px-[7px] py-[5px] text-muted">{got ? "획득 완료" : got === null ? "미획득" : "확인 중"}</span>
        </div>
        <p className="t-caption mt-6 text-faint">{badge.category}</p>
        <p className="t-title mt-1.5">{badge.name}</p>
        <p className="t-label mt-2 text-muted">{badge.description}</p>
        <dl className="mt-6">
          {rows.map(([k, v]) => (
            <div key={k} className="t-label flex h-12 items-center gap-3">
              <dt className="w-[76px] text-faint">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="t-caption mt-5 text-faint">{got ? "방문 기록을 바탕으로 획득한 배지입니다." : `${badge.motif}에 고리를 남기면 받을 수 있어요.`}</p>
        <Link href="/collection" className="btn mt-10 w-full">수집함으로 돌아가기</Link>
      </div>
    </div>
  );
}
