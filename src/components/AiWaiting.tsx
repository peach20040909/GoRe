"use client";
// AI가 기억 카드를 만드는 동안의 대기 화면: 장소 캐릭터가 둥실거리고, 지금 AI가 하는 일이 단계별로 바뀜
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

const STEPS = ["편지를 읽고 있어요", "그날의 감정을 읽고 있어요", "기억 카드를 그리고 있어요", "열어 볼 조건을 고르고 있어요"];

/* eslint-disable @next/next/no-img-element */
export function AiWaiting({ character, place }: { character: string; place: string }) {
  const { t } = useLanguage();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), 2200); // 마지막 단계에서 멈춤
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col items-center justify-center bg-surface/95 px-8 text-center backdrop-blur-sm" role="status" aria-live="polite">
      <div className="relative">
        <span className="ai-glow absolute inset-x-6 bottom-2 h-6 rounded-[50%] bg-black/10 blur-md" aria-hidden />
        <img src={character} alt="" className="ai-float relative h-[180px]" />
        <span className="ai-spark absolute -right-3 top-4 text-2xl" aria-hidden>✦</span>
        <span className="ai-spark absolute -left-2 top-16 text-lg [animation-delay:.6s]" aria-hidden>✦</span>
      </div>
      <p className="t-caption mt-8 text-muted">{t("{place}에서 남긴 편지", { place })}</p>
      <p key={i} className="ai-step t-heading mt-2">{t(STEPS[i])}</p>
      {/* 단계 표시 */}
      <div className="mt-5 flex gap-2" aria-hidden>
        {STEPS.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all duration-500 ${n <= i ? "w-6 bg-accent" : "w-1.5 bg-line"}`} />
        ))}
      </div>
      <p className="t-caption mt-6 text-faint">{t("AI가 기억 카드를 만들고 있어요. 잠시만 기다려 주세요.")}</p>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .ai-float { animation: ai-float 2.4s ease-in-out infinite; }
          .ai-glow { animation: ai-glow 2.4s ease-in-out infinite; }
          .ai-spark { animation: ai-spark 1.6s ease-in-out infinite; color: var(--accent); }
          .ai-step { animation: ai-step .45s ease-out; }
        }
        @keyframes ai-float { 0%,100% { transform: translateY(0) rotate(-2deg) } 50% { transform: translateY(-14px) rotate(2deg) } }
        @keyframes ai-glow { 0%,100% { transform: scaleX(1); opacity: .9 } 50% { transform: scaleX(.75); opacity: .5 } }
        @keyframes ai-spark { 0%,100% { opacity: 0; transform: scale(.6) } 50% { opacity: 1; transform: scale(1.1) } }
        @keyframes ai-step { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  );
}
