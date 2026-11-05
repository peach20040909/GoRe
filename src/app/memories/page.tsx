"use client";
// 02 추억 (Figma): 관광자원 분류 필터 + 기억 사진 카드 피드 → 상세
import { useLanguage } from "@/components/LanguageProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav, Character, Header } from "@/components/ds";
import { goriAsset, goriById } from "@/lib/goris";
import { loadMemories, type MemoryItem } from "@/lib/memories";
import { getToken } from "@/lib/session";
import { BADGES, CATEGORIES } from "@/lib/badges";

const fmt = (d: string, locale: string) => new Date(d).toLocaleDateString(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\s/g, "").replace(/\.$/, "");

/* eslint-disable @next/next/no-img-element */
export default function MemoriesPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<MemoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then(setItems).catch((e: Error) => setError(e.message));
  }, [router]);

  // 수집 화면과 같은 장소 → 관광자원 분류를 사용한다.
  const shown = (items ?? []).filter((it) => !filter || BADGES.some((b) => b.category === filter && it.placeSlug !== null && b.places.includes(it.placeSlug)));
  const chip = (on: boolean) => `t-strong h-8 shrink-0 rounded-lg px-3 ${on ? "bg-accent text-white" : "border border-line text-muted"}`;

  return (
    <div className="min-h-dvh">
      <Header title={t("추억")} />
      <div className="character-banner mx-6 mb-5 mt-2 h-[92px] bg-subtle px-5 py-4">
        <p className="relative z-10 text-[19px] font-bold leading-[27px]">{t("다시 꺼내 보는")}<br />{t("우리의 순간")}</p>
        <img src="/theme/pink-friend.png" alt="" className="-right-0.5 top-1 h-[90px] w-[90px]" />
      </div>
      <div className="flex flex-wrap gap-2 px-6 pb-4 pt-2.5" role="group" aria-label={t("관광자원 분류 필터")}>
        <button className={chip(!filter)} aria-pressed={!filter} onClick={() => { setFilter(null); setMenu(null); }}>{t("전체")}</button>
        {CATEGORIES.map((category) => (
          <button key={category} className={chip(filter === category)} aria-pressed={filter === category} onClick={() => { setFilter(category); setMenu(null); }}>{t(category)}</button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-6 pb-6">
        {error && <p role="alert" className="t-label rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{t(error)}</p>}
        {!items && !error && [0, 1].map((i) => <div key={i} className="skeleton h-[236px]" />)}
        {items?.length === 0 && (
          <div className="rounded-2xl border border-line p-6 text-center">
            <p className="t-strong">{t("아직 걸어 둔 고리가 없어요")}</p>
            <Link href="/" className="btn mt-4 w-full">{t("장소 고르러 가기")}</Link>
          </div>
        )}
        {!!items?.length && shown.length === 0 && !error && (
          <div className="rounded-2xl border border-line bg-canvas p-6 text-center" role="status">
            <p className="t-strong">{t("이 분류에 남긴 고리가 없어요")}</p>
            <p className="t-caption mt-2 text-muted">{t("다른 분류를 선택하거나 전체 추억을 확인해 보세요.")}</p>
            <button className="btn btn-ghost mt-4 w-full" onClick={() => setFilter(null)}>{t("전체 보기")}</button>
          </div>
        )}
        {shown.map((it) => {
          const g = goriById(it.medium);
          const img = it.status === "opened" && it.photoUrl ? it.photoUrl : g ? (it.status === "opened" ? goriAsset(g.id).opened : goriAsset(g.id).sealed) : null;
          return (
            <div key={it.id} className="relative rounded-2xl border border-line bg-surface">
              <div className="flex h-[76px] items-center gap-3 py-4 pl-4 pr-1">
                <Link href={`/memories/${it.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Character slug={it.placeSlug} size={40} />
                  <div className="min-w-0">
                    <p className="t-strong truncate">{it.title ?? g?.name ?? t("기억")}</p>
                    <p className="t-caption text-muted">{t(it.placeName ?? "")} · {fmt(it.createdAt, locale)}{it.status === "locked" && t(" · 🔒 잠김")}</p>
                  </div>
                </Link>
                {/* DS / More icon button → DS / Memory overflow menu (내 고리에만) */}
                <button aria-label={t("더보기")} aria-expanded={menu === it.id} onClick={() => setMenu(menu === it.id ? null : it.id)} className="flex size-11 shrink-0 items-center justify-center">
                  <img src="/ds/icon-more.svg" alt="" width={20} height={20} />
                </button>
              </div>
              {menu === it.id && (
                <Link href={`/memories/${it.id}/delete`} className="t-label absolute right-0 top-11 z-10 flex h-14 w-[164px] items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  <img src="/ds/icon-trash.svg" alt="" width={20} height={20} />{t("고리 삭제")}</Link>
              )}
              {img && (
                <Link href={`/memories/${it.id}`} className="block overflow-hidden rounded-b-2xl">
                  <img src={img} alt="" className="h-40 w-full bg-canvas object-cover" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav active="memories" />
    </div>
  );
}
