"use client";

import { useEffect, useId, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { MemoryItem } from "@/lib/memories";

type Props = {
  title: string;
  body: string | null;
  place: string;
  placeSlug?: string | null; // 편지지 오른쪽 위 장소 그림 선택용
  date: string;
  coverImage: string;
  photoUrl?: string | null;
  photoCredit?: NonNullable<MemoryItem["card"]>["photoCredit"];
  readable: boolean;
  initiallyOpen?: boolean;
  onRequestUnlock?: () => void;
  className?: string;
};

/** Figma DS 579:429 / 579:457. A visual cover is separate from server unlock status. */
// 편지지 오른쪽 위 장소 그림. 없는 장소(경복궁 포함)는 원본 한지 그림의 광화문을 씀
const STAMP: Record<string, string> = {
  "demo-hall": "/stationery/stamp-myongji.svg",
  "hongje-falls": "/stationery/stamp-hongje.svg",
  dongnimmun: "/stationery/stamp-dongnimmun.svg",
};

export function MemoryLetter({ title, body, place, placeSlug, date, coverImage, photoUrl, photoCredit, readable, initiallyOpen = false, onRequestUnlock, className = "" }: Props) {
  const { t } = useLanguage();
  const [revealed, setRevealed] = useState(initiallyOpen);
  const bodyId = useId();
  useEffect(() => { if (initiallyOpen && readable) setRevealed(true); }, [initiallyOpen, readable]);
  const showLetter = readable && revealed;
  // 출처 표시: 위키미디어 공용의 CC 라이선스 또는 공공누리(KOGL) 사진
  const credited = photoCredit?.sourceUrl.startsWith("https://commons.wikimedia.org/") && /^https?:\/\/(creativecommons\.org|www\.kogl\.or\.kr)\//.test(photoCredit.licenseUrl);
  const stamp = placeSlug ? STAMP[placeSlug] : undefined;

  return (
    <div className={className}>
      <article className="memory-letter relative isolate min-h-[520px] overflow-hidden rounded-[4px] bg-[#f7efdf] px-6 pb-6 pt-[22px] text-[#52644b] shadow-[0_6px_24px_rgba(46,33,20,0.09)]">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-35" aria-hidden="true">
          {/* The source art is intentionally cropped to its blank-paper strip, as in Figma. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stationery/hanji-reference.png" alt="" className="absolute max-w-none" style={{ width: "106.38%", height: "1250%", left: "-3.19%", top: "-12.5%" }} />
        </div>
        <header className="flex min-h-10 items-center justify-between gap-3">
          <p className="min-w-0 break-words text-[17px] font-bold leading-[26px]">{t("{place}의 추억", { place })}</p>
          <div className="relative h-10 w-20 shrink-0 overflow-hidden" aria-hidden="true">
            {stamp ? (
              // 장소별 잉크 선화 (경복궁 외)
              // eslint-disable-next-line @next/next/no-img-element
              <img src={stamp} alt="" width={80} height={40} className="h-10 w-20" />
            ) : (
              // 경복궁(기본): 원본 한지 그림에서 광화문 부분만 잘라 씀
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/stationery/hanji-reference.png" alt="" className="absolute max-w-none" style={{ width: "416.67%", height: "1250%", left: "-304.17%", top: "-100%" }} />
            )}
          </div>
        </header>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/stationery/divider.svg" alt="" width={294} height={16} className="mt-2.5 block h-auto max-w-full" />
        <h2 className="memory-handwriting mt-3.5 min-h-[42px] break-words border-b border-[#cac8b0]/80 pb-1 text-[30px] leading-[42px]">{title}</h2>
        {showLetter ? (
          <div id={bodyId} tabIndex={0} role="region" aria-label={t("편지 내용")} className="letter-reveal mt-4 h-[288px] overflow-y-auto overscroll-contain break-words pr-1 text-[17px] leading-8 outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#52644b]">
            <p className="whitespace-pre-wrap">{body}</p>
            {photoUrl && (
              <figure className="mt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={t("그날의 사진")} className="h-auto w-full rounded-xl" />
                {credited && photoCredit && <figcaption className="mt-2 font-sans text-[10px] leading-4 opacity-80">
                  {t("사진:")}{" "}<a href={photoCredit.sourceUrl} target="_blank" rel="noreferrer" className="underline">{photoCredit.author} / Wikimedia Commons</a>
                  {" · "}<a href={photoCredit.licenseUrl} target="_blank" rel="noreferrer" className="underline">{photoCredit.license}</a>{" "}{t("· 원본")}
                </figcaption>}
              </figure>
            )}
          </div>
        ) : (
          <button type="button" aria-label={t(readable ? "눌러서 편지 읽기" : "현장 인증 후 편지 열기")} aria-expanded={false}
            onClick={() => { if (readable) setRevealed(true); else onRequestUnlock?.(); }}
            className="mt-4 flex h-[288px] w-full flex-col items-center text-center outline-offset-4 focus-visible:outline-2 focus-visible:outline-[#52644b]">
            <span className="text-[19px] font-bold leading-[26px]">{t("잠가둔 기억")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage} alt={t("봉인된 고리")} className="mt-3 h-[220px] w-full max-w-[250px] rounded-3xl object-contain" />
            <span className="mt-1.5 text-[13px] leading-5 opacity-80">{t(readable ? "눌러서 편지 읽기" : "현장 인증 후 편지 열기")}</span>
          </button>
        )}
        <footer className="memory-handwriting mt-5 flex flex-wrap justify-end gap-x-1.5 text-right text-[17px] leading-6"><span>{place}</span><span aria-hidden="true">·</span><span>{date}</span></footer>
      </article>
      {showLetter && <button type="button" className="t-caption mx-auto mt-3 block min-h-11 px-4 text-muted underline underline-offset-4" onClick={() => setRevealed(false)}>{t("자물쇠 다시 보기")}</button>}
    </div>
  );
}
