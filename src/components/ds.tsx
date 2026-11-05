"use client";
// Figma "DS v1.0" 공통 부품: Header, Bottom navigation, Character, Option row, Media tile
import { useLanguage, LanguageSwitcher } from "@/components/LanguageProvider";
import Link from "next/link";
import { characterFor } from "@/lib/media";

/* eslint-disable @next/next/no-img-element */

export function Header({ title, back, inverse = false }: { title: string; back?: string | (() => void); inverse?: boolean }) {
  const { t } = useLanguage();
  const icon = <img src="/ds/icon-back.svg" alt="" width={24} height={24} />;
  return (
    <header className={`sticky top-0 z-20 flex h-14 items-center px-6 ${inverse ? "bg-transparent text-white" : "bg-surface"}`}>
      {back &&
        (typeof back === "string" ? (
          <Link href={back} aria-label={t("뒤로")} className="-ml-[10px] flex size-11 items-center justify-center">{icon}</Link>
        ) : (
          <button onClick={back} aria-label={t("뒤로")} className="-ml-[10px] flex size-11 items-center justify-center">{icon}</button>
        ))}
      <h1 className="t-sub min-w-0 flex-1 truncate pr-2">{t(title)}</h1>
      <LanguageSwitcher inverse={inverse} />
    </header>
  );
}

const TABS = [
  { key: "home", label: "홈", href: "/", on: "/ds/icon-house.svg", off: "/ds/icon-house-off.svg" },
  { key: "memories", label: "추억", href: "/memories", on: "/ds/icon-book-on.svg", off: "/ds/icon-book.svg" },
  { key: "gori", label: "고리", href: "/gori", on: "/ds/icon-lock-on.svg", off: "/ds/icon-lock.svg" },
  { key: "collection", label: "수집", href: "/collection", on: "/ds/icon-award-on.svg", off: "/ds/icon-award.svg" },
  { key: "my", label: "마이", href: "/my", on: "/ds/icon-user-on.svg", off: "/ds/icon-user.svg" },
] as const;

/** 하단 탭 (DS / Bottom navigation) */
export function BottomNav({ active }: { active: "home" | "memories" | "gori" | "collection" | "my" }) {
  const { t } = useLanguage();
  return (
    <>
      <div className="h-[76px]" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[76px] max-w-[430px] items-center justify-between bg-surface px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const on = tab.key === active;
          const body = (
            <>
              <img src={on ? tab.on : tab.off} alt="" width={22} height={22} />
              <span className={`t-caption ${on ? "text-text" : "text-faint"}`}>{t(tab.label)}</span>
            </>
          );
          const cls = `flex h-[60px] w-[70px] flex-col items-center justify-center gap-1 rounded-xl ${on ? "bg-subtle" : ""}`;
          return (
            <Link key={tab.key} href={tab.href} className={cls} aria-current={on ? "page" : undefined}>{body}</Link>
          );
        })}
      </nav>
    </>
  );
}

/** 장소 캐릭터 원형 초상 (두근·산들·퐁당·해태 고리) */
export function Character({ slug, size = 40 }: { slug?: string | null; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ width: size, height: size, background: "var(--portrait-bg)" }}>
      <img src={characterFor(slug)} alt="" style={{ height: size * 1.05, marginTop: size * 0.08 }} />
    </span>
  );
}

export function OptionRow({ title, desc, selected, onSelect }: { title: string; desc?: string; selected: boolean; onSelect: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex min-h-20 w-full items-center gap-3 rounded-xl p-4 text-left ${selected ? "border-[1.5px] border-accent bg-canvas" : "border border-line bg-surface"}`}
    >
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-surface ${selected ? "border-accent" : "border-faint"}`}>
        {selected && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="t-strong">{t(title)}</span>
        {desc && <span className="t-caption text-muted">{t(desc)}</span>}
      </span>
    </button>
  );
}

export function MediaTile({ src, label, onFile, capture }: { src?: string | null; label: string; onFile: (f: File) => void; capture?: boolean }) {
  const { t } = useLanguage();
  return (
    <label className="relative flex h-[136px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-line bg-canvas">
      {src ? (
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <>
          <img src="/ds/icon-camera.svg" alt="" width={24} height={24} />
          <span className="t-label text-muted">{t(label)}</span>
        </>
      )}
      <input type="file" accept="image/*" capture={capture ? "environment" : undefined} hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
    </label>
  );
}
