"use client";
// 04 수집 · 장소 배지
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav, Header } from "@/components/ds";
import { BADGES, CATEGORIES, badgeArt, earnedBadges } from "@/lib/badges";
import { loadMemories } from "@/lib/memories";
import { getToken } from "@/lib/session";

/* eslint-disable @next/next/no-img-element */
export default function CollectionPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [earned, setEarned] = useState<ReturnType<typeof earnedBadges> | null>(null);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then((m) => setEarned(earnedBadges(m))).catch(() => setEarned(new Map()));
  }, [router]);

  return (
    <div className="min-h-dvh">
      <Header title={t("수집")} />
      <div className="px-6 pb-6">
        <p className="t-title mt-2">{t("여행이 모이면, 나의 배지")}</p>
        <p className="t-label mt-2 text-muted">{t("장소에 고리를 남기고 배지를 모아보세요.")}</p>
        <div className="mt-7 flex flex-col gap-6">
          {CATEGORIES.map((c) => {
            const list = BADGES.filter((b) => b.category === c);
            return (
              <section key={c}>
                <div className="flex items-start justify-between">
                  <p className="t-strong">{t(c)}</p>
                  <p className="t-caption text-faint">{earned ? list.filter((b) => earned.has(b.id)).length : "–"} / {list.length}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {list.map((b) => {
                    const on = earned?.has(b.id);
                    return (
                      <Link key={b.id} href={`/collection/${b.id}`} className="flex min-h-[124px] flex-col items-center gap-0.5">
                        <img src={badgeArt(b.id)} alt="" width={72} height={72} className={on ? "" : "opacity-25"} />
                        <span className={`t-label text-center ${on ? "" : "text-faint"}`}>{t(b.name)}</span>
                        <span className={`t-caption ${on ? "text-muted" : "text-faint"}`}>{on ? t("획득") : t("미획득")}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <BottomNav active="collection" />
    </div>
  );
}
