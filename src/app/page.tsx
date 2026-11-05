"use client";
// 홈 (Figma: 홈 · 지도 기본 / 주변 장소 목록 / 핀 선택 · 장소 정보)
// 지도 + 아래 시트. 시트는 접힘 → 주변 장소 목록 → 핀/행을 누르면 장소 정보 → "여기에 고리 걸기"로 고리 플로우
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NaverMap, type MapPlace } from "@/components/NaverMap";
import { BottomNav, Character, Header } from "@/components/ds";
import { goriAsset } from "@/lib/goris";
import { mediaFor } from "@/lib/media";

// 홈 지도에 보일 장소만 (다른 장소는 DB에 있고 고리·해금은 그대로 동작)
const HOME: Record<string, { category: string; address: string }> = {
  gyeongbokgung: { category: "궁궐 · 한국 전통 장소", address: "서울 종로구 사직로 161" },
  dongnimmun: { category: "역사 유적 · 독립공원", address: "서울 서대문구 통일로 251" },
  "demo-hall": { category: "대학 캠퍼스", address: "서울 서대문구 거북골로 34" },
};
const MAP_H = "calc(100dvh - 56px - 76px - 90px)"; // 접힌 시트(90px) 위에서 끝나야 네이버 로고가 안 가려짐

/* eslint-disable @next/next/no-img-element */
export default function Home() {
  const [places, setPlaces] = useState<MapPlace[] | null>(null);
  const [sheet, setSheet] = useState<"peek" | "list">("peek");
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const touchY = useRef(0);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: MapPlace[] }) => setPlaces((d.places ?? []).filter((p) => p.slug in HOME)))
      .catch(() => setPlaces([]));
  }, []);

  const select = useCallback((slug: string) => setSelected((places ?? []).find((p) => p.slug === slug) ?? null), [places]);
  const open = selected ? "detail" : sheet;
  const g = selected && goriAsset(mediaFor(selected.slug).goriId);

  return (
    <div className="relative">
      <Header title="홈" />
      {/* 지도는 헤더 아래 꽉 차게, 제목은 지도 위에 띄움 (Figma 홈 · 지도 기본) */}
      <div className="relative isolate">
        {places ? <NaverMap places={places} onSelect={select} height={MAP_H} square /> : <div className="skeleton !rounded-none" style={{ height: MAP_H }} />}
        <h2 className="t-title pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-white/95 via-white/80 to-transparent px-6 pb-10 pt-4">
          오늘의 고리를
          <br />
          어디에 남길까요?
        </h2>
      </div>

      {/* 바텀 시트 (DS / Nearby places sheet · DS / Place detail sheet). 손잡이를 누르거나 위로 밀면 올라옴 */}
      <section
        className="fixed inset-x-0 bottom-[76px] z-20 mx-auto h-[416px] max-w-[430px] rounded-t-3xl bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-300"
        style={{ transform: open === "peek" ? "translateY(326px)" : "none" }}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          const dy = e.changedTouches[0].clientY - touchY.current;
          if (dy < -30 && open === "peek") setSheet("list");
          if (dy > 30 && open !== "peek") (selected ? setSelected(null) : setSheet("peek"));
        }}
      >
        <button
          aria-label={open === "peek" ? "주변 장소 펼치기" : "접기"}
          onClick={() => (selected ? setSelected(null) : setSheet(sheet === "peek" ? "list" : "peek"))}
          className="flex h-[46px] w-full justify-center pt-3"
        >
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
        </button>

        {open !== "detail" && (
          <div className="px-6">
            <p className="t-heading">주변 장소</p>
            <p className="t-caption mt-1 text-muted">지금 고리를 남길 수 있는 곳</p>
            <ul className="mt-3 flex h-[280px] flex-col gap-2 overflow-y-auto pb-4">
              {(places ?? []).map((p) => (
                <li key={p.slug}>
                  <button onClick={() => select(p.slug)} className="flex h-[92px] w-full items-center gap-3 rounded-xl border border-line p-3 text-left">
                    <Character slug={p.slug} size={64} />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="t-strong">{p.name_ko}</span>
                      <span className="t-caption truncate text-muted">{HOME[p.slug].category} · {HOME[p.slug].address}</span>
                    </span>
                  </button>
                </li>
              ))}
              {places?.length === 0 && <li className="t-label text-muted">장소를 불러오지 못했어요. 잠시 후 다시 열어 주세요.</li>}
            </ul>
          </div>
        )}

        {selected && g && (
          <div className="relative px-6 pt-2">
            <button onClick={() => setSelected(null)} aria-label="닫기" className="absolute -top-6 right-3 flex size-11 items-center justify-center text-2xl font-bold">×</button>
            <div className="flex items-center gap-3">
              <p className="t-title">{selected.name_ko}</p>
              <p className="t-caption text-muted">{HOME[selected.slug]?.category}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="t-caption w-7 shrink-0 text-muted">주소</span>
              <span className="t-label">{HOME[selected.slug]?.address}</span>
            </div>
            <p className="t-caption mt-3 text-muted">이곳의 고리 · {mediaFor(selected.slug).label} · 남겨진 기억 {selected.memoryCount ?? 0}개</p>
            <div className="mt-2 flex gap-2.5">
              <img src={g.sealed} alt="봉인된 고리" className="h-[88px] min-w-0 flex-1 rounded-lg bg-canvas object-cover" />
              <img src={g.opened} alt="열린 고리" className="h-[88px] min-w-0 flex-1 rounded-lg bg-canvas object-cover" />
            </div>
            <Link href={`/gori/${selected.slug}`} className="btn mt-6 w-full">여기에 고리 걸기</Link>
          </div>
        )}
      </section>
      <BottomNav active="home" />
    </div>
  );
}
