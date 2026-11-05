"use client";
// 스플래시 (Figma "Splash / Icon to GORE"): 어두운 앱 아이콘 → 아이콘 안에서 두근고리가 밖으로 나옴 →
// 양쪽 고리가 맞물려 잠김 → GO:RE → GO AGAIN RE CONNECT. 세션당 처음 한 번만, 약 3.5초 뒤 사라짐
import { useEffect, useState } from "react";

const KEY = "gore_splash_seen";
const TOTAL_MS = 3500;

/* eslint-disable @next/next/no-img-element */
export function Splash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* 저장소가 막혀 있으면 매번 보여 줌 */
    }
    if (seen) return setShow(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => setShow(false), reduced ? 900 : TOTAL_MS);
    return () => clearTimeout(id);
  }, []);

  if (!show) return null;
  return (
    <div className="splash fixed inset-0 z-[100] flex items-center justify-center bg-[#3b45b2]" aria-hidden>
      <div className="relative h-[320px] w-[154px]">
        {/* 앱 아이콘 배경판: 캐릭터가 나온 뒤 작아지며 사라짐 */}
        <div className="sp-icon absolute left-0 top-[29px] size-[154px] rounded-[28px] bg-white/20" />
        {/* 두근고리: 처음엔 아이콘 경계 안에서만 보이다가 밖으로 드러남 */}
        <div className="sp-reveal absolute left-0 top-0 h-[193px] w-[154px]">
          <div className="sp-char relative h-[193px] w-[154px]">
            <div className="absolute left-0 top-0 h-[106px] w-[154px]">
              <div className="sp-left absolute bottom-[18.18%] left-[30.63%] right-1/2 top-[24.09%]">
                <img src="/splash/shackle-left.svg" alt="" className="absolute inset-[-11.42%_-23.39%] block size-[146.78%] max-w-none" />
              </div>
              <div className="sp-right absolute bottom-[18.18%] left-1/2 right-[30.63%] top-[24.09%]">
                <img src="/splash/shackle-right.svg" alt="" className="absolute inset-[-11.42%_-23.39%] block size-[146.78%] max-w-none" />
              </div>
            </div>
            <img src="/splash/heart-body.webp" alt="" className="absolute left-0 top-[43px] size-[154px] object-contain" />
          </div>
        </div>
        <p className="sp-logo absolute left-1/2 top-[268px] w-[250px] -translate-x-1/2 text-center text-[28px] font-bold tracking-[6px] text-white">GO:RE</p>
        <p className="sp-tag absolute left-1/2 top-[281px] w-[340px] -translate-x-1/2 text-center text-[21px] font-bold text-white/90">GO AGAIN RE CONNECT</p>
      </div>
      <style>{`
        .splash { animation: sp-out .4s ease-in 3.1s both; }
        .sp-icon { animation: sp-icon 1.65s ease-out both; }
        .sp-reveal { animation: sp-reveal 1.15s ease-in-out both; }
        .sp-char { transform-origin: 50% 50%; animation: sp-char 1.25s ease-out both; }
        .sp-left { animation: sp-left 1.38s ease-in-out both; }
        .sp-right { animation: sp-right 1.38s ease-in-out both; }
        .sp-logo { animation: sp-logo 2.15s ease-out both; }
        .sp-tag { animation: sp-tag 2.5s ease-out both; }
        @keyframes sp-out { to { opacity: 0; visibility: hidden } }
        @keyframes sp-icon { 0% { opacity: 0 } 11% { opacity: 1; transform: scale(1) } 52% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(.94) } }
        /* 아이콘 사각형(위 29px·아래 10px 잘림, 둥근 모서리) → 전체 */
        @keyframes sp-reveal { 0%, 48% { clip-path: inset(29px 0 10px 0 round 28px) } 100% { clip-path: inset(-60px -120px -60px -120px round 0) } }
        @keyframes sp-char { 0% { opacity: 0; transform: scale(1.25) } 14% { opacity: 1; transform: scale(1.25) } 44% { transform: scale(1.25) } 74% { transform: scale(1.07) } 92% { transform: translateY(-3px) scale(1) } 100% { opacity: 1; transform: none } }
        /* 고리 양쪽이 벌어져 있다가 '찰칵' 맞물림 */
        @keyframes sp-left { 0%, 76% { transform: translateX(-12px) } 100% { transform: none } }
        @keyframes sp-right { 0%, 76% { transform: translateX(12px) } 100% { transform: none } }
        @keyframes sp-logo { 0%, 67% { opacity: 0; translate: -50% 7px } 84% { opacity: 1; translate: -50% 0 } 95% { opacity: 1 } 100% { opacity: 0; translate: -50% 0 } }
        @keyframes sp-tag { 0%, 88% { opacity: 0; translate: -50% 5px } 100% { opacity: 1; translate: -50% 0 } }
        @media (prefers-reduced-motion: reduce) {
          .splash, .sp-icon, .sp-reveal, .sp-char, .sp-left, .sp-right, .sp-logo, .sp-tag { animation: none !important; }
          .sp-icon, .sp-logo { opacity: 0 } .sp-reveal { clip-path: none }
        }
      `}</style>
    </div>
  );
}
