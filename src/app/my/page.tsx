"use client";
// 마이 · 설정 진입 (Figma)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav, Character, Header } from "@/components/ds";
import { earnedBadges } from "@/lib/badges";
import { loadMemories } from "@/lib/memories";
import { clearSession, getToken, getUser } from "@/lib/session";

/* eslint-disable @next/next/no-img-element */
function Row({ title, desc, count, href, onClick }: { title: string; desc: string; count?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="t-strong">{title}</span>
        <span className="t-caption text-muted">{desc}</span>
      </span>
      {count && <span className="t-caption text-muted">{count}</span>}
      <img src="/ds/icon-chevron-right.svg" alt="" width={20} height={20} />
    </>
  );
  const cls = "flex h-[76px] w-full items-center gap-4 p-4 text-left";
  return href ? <Link href={href} className={cls}>{body}</Link> : <button onClick={onClick} className={cls}>{body}</button>;
}

export default function MyPage() {
  const router = useRouter();
  const [name, setName] = useState("여행자");
  const [counts, setCounts] = useState<{ mem: number; badges: number } | null>(null);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    const u = getUser();
    if (u?.nickname) setName(u.nickname);
    loadMemories().then((m) => setCounts({ mem: m.length, badges: earnedBadges(m).size })).catch(() => setCounts(null));
  }, [router]);

  return (
    <div className="min-h-dvh">
      <Header title="마이" />
      <div className="px-6 pb-6">
        <div className="character-banner mt-2 h-[148px] bg-accent px-5 py-6 text-white">
          <p className="relative z-10 text-[21px] font-bold leading-[29px]">쌓인 고리,<br />나만의 여행 기록</p>
          <img src="/theme/pink-friend.png" alt="" className="-right-1.5 top-5 h-32 w-32" />
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="t-title">안녕하세요, {name}님</p>
          <Character slug="demo-hall" size={48} />
        </div>
        <p className="t-sub mt-6">설정</p>
        <div className="mt-3.5 flex flex-col gap-4">
          <Row title="내 추억" desc="장소에 남긴 사진과 편지" count={counts ? `${counts.mem}개` : undefined} href="/memories" />
          <Row title="내 수집" desc="모은 장소 문양" count={counts ? `${counts.badges}개` : undefined} href="/collection" />
          <Row title="설정" desc="계정·알림·권한 관리" onClick={() => setSettings(!settings)} />
          {settings && (
            <div className="rounded-xl bg-canvas p-4">
              <p className="t-caption text-muted">{getUser()?.email ?? "로그인한 계정"}</p>
              <p className="t-caption mt-1 text-muted">알림·권한은 휴대폰 설정에서 바꿀 수 있어요.</p>
              <button
                className="btn btn-ghost mt-4 w-full"
                onClick={() => {
                  clearSession();
                  router.replace("/login");
                }}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
      <BottomNav active="my" />
    </div>
  );
}
