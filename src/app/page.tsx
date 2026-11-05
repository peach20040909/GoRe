"use client";
// 홈 (Figma: 홈 · 지도 기본 / 주변 장소 목록 / 핀 선택 · 장소 정보)
// 지도 + 아래 시트. 시트는 접힘 → 주변 장소 목록 → 핀/행을 누르면 장소 정보 → "여기에 고리 걸기"로 고리 플로우
import { useLanguage } from "@/components/LanguageProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NaverMap, type MapPlace } from "@/components/NaverMap";
import { BottomNav, Character, Header, WarnDialog } from "@/components/ds";
import { useRouter } from "next/navigation";
import { distanceM, fmtDistance, ga, getPosition } from "@/lib/client";
import { goriAsset } from "@/lib/goris";
import { mediaFor } from "@/lib/media";
import { loadMemories } from "@/lib/memories";
import { getToken, isDemo } from "@/lib/session";
import { BADGES, earnedBadges } from "@/lib/badges";

// 홈 지도에 보일 장소만 (다른 장소는 DB에 있고 고리·해금은 그대로 동작)
const HOME: Record<string, { category: string; address: string }> = {
  gyeongbokgung: { category: "궁궐 · 한국 전통 장소", address: "서울 종로구 사직로 161" },
  dongnimmun: { category: "역사 유적 · 독립공원", address: "서울 서대문구 통일로 251" },
  "demo-hall": { category: "대학 캠퍼스", address: "서울 서대문구 거북골로 34" },
  "hongje-falls": { category: "자연·경관", address: "서울 서대문구 연희동 170-181" },
};
const MAP_H = "calc(100dvh - 56px - 76px - 90px)"; // 접힌 시트(90px) 위에서 끝나야 네이버 로고가 안 가려짐

/* eslint-disable @next/next/no-img-element */
export default function Home() {
  const { t } = useLanguage();
  const [places, setPlaces] = useState<MapPlace[] | null>(null);
  const [sheet, setSheet] = useState<"peek" | "list">("peek");
  const [selected, setSelected] = useState<MapPlace | null>(null);
  const [exploring, setExploring] = useState(false);
  const touchY = useRef(0);
  const [drag, setDrag] = useState(0); // 시트를 끄는 중인 거리(px)
  const dragging = useRef(false);
  const moved = useRef(false);
  const [summary, setSummary] = useState<{ memories: number; badges: number } | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [warn, setWarn] = useState<{ title: string; desc: string } | null>(null);

  // "여기에 고리 걸기": 그 장소 반경 안에 있을 때만 카메라(고리) 화면으로. 아니면 경고 팝업 (시연 모드는 통과)
  async function goHang(p: MapPlace) {
    if (isDemo()) return router.push(`/gori/${p.slug}`);
    setChecking(true);
    const pos = await getPosition();
    setChecking(false);
    const name = t(p.name_ko);
    if (!pos) return setWarn({ title: t("위치를 확인할 수 없어요"), desc: t("위치 권한을 허용한 뒤 다시 시도해 주세요.") });
    if (p.lat == null || p.lng == null) return router.push(`/gori/${p.slug}`);
    const d = distanceM(pos, { lat: p.lat, lng: p.lng });
    if (d > (p.radius_m ?? 150))
      return setWarn({
        title: t("여기는 {place}{ga} 아니에요!", { place: name, ga: ga(name) }),
        desc: t("{place}까지 {distance} 남았어요. {place}에 도착하면 고리를 걸 수 있어요.", { place: name, distance: fmtDistance(d) }),
      });
    router.push(`/gori/${p.slug}`);
  }

  useEffect(() => {
    if (!getToken()) { setSummary({ memories: 0, badges: 0 }); return; }
    let active = true;
    loadMemories().then((memories) => {
      if (active) setSummary({ memories: memories.length, badges: earnedBadges(memories).size });
    }).catch(() => { if (active) setSummaryError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: MapPlace[] }) => setPlaces((d.places ?? []).filter((p) => p.slug in HOME)))
      .catch(() => setPlaces([]));
  }, []);

  const select = useCallback((slug: string) => {
    setSelected((places ?? []).find((p) => p.slug === slug) ?? null);
    setExploring(true);
  }, [places]);
  const open = selected ? "detail" : sheet;
  const g = selected && goriAsset(mediaFor(selected.slug).goriId);

  return (
    <div className="relative">
      {exploring ? <Header title={t("홈")} back={() => { setExploring(false); setSelected(null); setSheet("peek"); }} /> : (
        <div className="home-hero !overflow-visible pb-0">
          <Header title={t("홈")} inverse />
          <div className="relative z-10 px-6 pb-2 pt-3">
            <h1 className="t-title relative z-10 w-[62%]">{t("고리를 남기는")}<br />{t("가장 가까운 여행")}</h1>
            <p className="t-caption relative z-10 mt-2 text-white/90">{t("오늘도 우리만의 장소로")}</p>
            <button className="relative z-10 mt-6 h-10 rounded-xl bg-white px-4 text-base font-medium text-accent" onClick={() => { setExploring(true); setSheet("list"); }}>{t("주변 둘러보기")}</button>
          </div>
          <img src="/theme/pink-friend.png" alt="" className="hero-friend" />
          <div className="relative z-10 mx-6 grid translate-y-3 grid-cols-2 gap-3">
            <Link href="/memories" className="rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-sm">
              <p className="t-caption text-muted">{t("남긴 고리")}</p>
              <p className="t-sub mt-1 text-accent">{summary ? t("{count}개의 고리", { count: summary.memories }) : summaryError ? t("확인 필요") : "…"}</p>
            </Link>
            <Link href="/collection" className="rounded-2xl border border-line bg-white px-4 py-3 text-ink shadow-sm">
              <p className="t-caption text-muted">{t("모은 배지")}</p>
              <p className="t-sub mt-1 text-accent">{summary ? `${summary.badges} / ${BADGES.length}` : summaryError ? t("확인 필요") : "…"}</p>
            </Link>
          </div>
        </div>
      )}
      {!exploring && <h2 className="t-sub px-6 pb-3 pt-8">{t("우리 동네, 새로운 기억")}</h2>}
      {/* 지도는 헤더 아래 꽉 차게, 제목은 지도 위에 띄움 (Figma 홈 · 지도 기본) */}
      <div className={`relative isolate ${exploring ? "" : "mx-6 overflow-hidden rounded-3xl"}`}>
        {places ? (
          <NaverMap
            key={exploring ? "explore" : "preview"}
            places={places}
            onSelect={select}
            onMapClick={() => {
              setSelected(null);
              setSheet("peek");
            }}
            compact={!exploring}
            showMe
            bottomInset={!exploring || open === "peek" ? 0 : (open === "detail" ? 480 : 416) - 90} // 펼친 시트가 지도를 덮는 높이
            height={exploring ? MAP_H : "max(220px, calc(100dvh - 560px))"}
            square
          />
        ) :<div className="skeleton !rounded-none" style={{ height: exploring ? MAP_H : "max(220px, calc(100dvh - 560px))" }} />}
        {!exploring && <button type="button" aria-label={t("지도에서 주변 장소 보기")} className="absolute inset-0 z-10 cursor-pointer rounded-3xl" onClick={() => { setExploring(true); setSheet("list"); }} />}
        {exploring && <h2 className="t-title pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-white/95 via-white/80 to-transparent px-6 pb-10 pt-4">{t("오늘의 고리를")}<br />{t("어디에 남길까요?")}</h2>}
      </div>
      {!exploring && <button className="t-label mx-6 mb-4 mt-4 flex min-h-11 items-center gap-1" onClick={() => { setExploring(true); setSheet("list"); }}>{t("가까운 장소 더 보기")}<span aria-hidden>›</span></button>}

      {/* 바텀 시트 (DS / Nearby places sheet · DS / Place detail sheet). 손잡이를 누르거나 위로 밀면 올라옴 */}
      {exploring && <section
        className={`fixed inset-x-0 bottom-[76px] z-20 mx-auto max-w-[430px] rounded-t-3xl bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)] transition-transform duration-300 ${open === "detail" ? "h-[480px] max-h-[calc(100dvh-132px)] overflow-y-auto" : "h-[416px]"}`}
        style={{
          transform: `translateY(${Math.max(0, (open === "peek" ? 326 : 0) + drag)}px)`,
          transition: dragging.current ? "none" : undefined, // 끄는 동안은 손가락(마우스)을 바로 따라옴
        }}
      >
        {/* 손잡이 영역: 마우스·터치 둘 다 위아래로 끌 수 있음. 놓으면 한 단계씩 올라가거나 내려감 */}
        <div
          className="cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={(e) => {
            touchY.current = e.clientY;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => dragging.current && setDrag(e.clientY - touchY.current)}
          onPointerUp={(e) => {
            const dy = e.clientY - touchY.current;
            dragging.current = false;
            setDrag(0);
            if (Math.abs(dy) < 8) return; // 거의 안 움직였으면 아래 버튼 클릭으로 처리
            moved.current = true;
            if (dy < -40 && open === "peek") setSheet("list");
            if (dy > 40 && open !== "peek") {
              setSelected(null); // 장소 정보에서 내리면 바로 접힘
              setSheet("peek");
            }
          }}
          onPointerCancel={() => {
            dragging.current = false;
            setDrag(0);
          }}
        >
          <button
            aria-label={open === "peek" ? t("주변 장소 펼치기") : t("접기")}
            onClick={() => {
              if (moved.current) return void (moved.current = false); // 끌기 직후 따라오는 클릭은 무시
              if (open === "peek") setSheet("list");
              else {
                setSelected(null);
                setSheet("peek");
              }
            }}
            className="flex h-[46px] w-full justify-center pt-3"
          >
            <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
          </button>
        </div>

        {open !== "detail" && (
          <div className="px-6">
            <p className="t-heading">{t("주변 장소")}</p>
            <p className="t-caption mt-1 text-muted">{t("지금 고리를 남길 수 있는 곳")}</p>
            <ul className="mt-3 flex h-[280px] flex-col gap-2 overflow-y-auto pb-4">
              {(places ?? []).map((p) => (
                <li key={p.slug}>
                  <button onClick={() => select(p.slug)} className="flex h-[92px] w-full items-center gap-3 rounded-xl border border-line p-3 text-left">
                    <Character slug={p.slug} size={64} />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="t-strong">{t(p.name_ko)}</span>
                      <span className="t-caption truncate text-muted">{t(HOME[p.slug].category)} · {t(HOME[p.slug].address)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {places?.length === 0 && <li className="t-label text-muted">{t("장소를 불러오지 못했어요. 잠시 후 다시 열어 주세요.")}</li>}
            </ul>
          </div>
        )}

        {selected && g && (
          <div className="relative px-6 pt-2">
            <button onClick={() => setSelected(null)} aria-label={t("닫기")} className="absolute -top-6 right-3 flex size-11 items-center justify-center text-2xl font-bold">×</button>
            <div className="flex items-center gap-3">
              <p className="t-title">{t(selected.name_ko)}</p>
              <p className="t-caption text-muted">{t(HOME[selected.slug]?.category ?? "")}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="t-caption shrink-0 text-muted">{t("주소")}</span>
              <span className="t-label">{t(HOME[selected.slug]?.address ?? "")}</span>
            </div>
            <p className="t-caption mt-3 text-muted">{t("이곳의 고리 ·")}{" "}{t(mediaFor(selected.slug).label)}{" "}{t("· 남겨진 기억")}{" "}{selected.memoryCount ?? 0}{t("개")}</p>
            <div className="mt-2 flex gap-2.5">
              <img src={g.sealed} alt={t("봉인된 고리")} className="h-[152px] min-w-0 flex-1 rounded-lg bg-canvas object-contain" />
              <img src={g.opened} alt={t("열린 고리")} className="h-[152px] min-w-0 flex-1 rounded-lg bg-canvas object-contain" />
            </div>
            <button className="btn mt-6 w-full" disabled={checking} onClick={() => goHang(selected)}>
              {checking ? t("위치를 확인하고 있어요…") : t("여기에 고리 걸기")}
            </button>
          </div>
        )}
      </section>}
      <BottomNav active="home" />
      {warn && <WarnDialog title={warn.title} desc={warn.desc} action={t("확인")} onClose={() => setWarn(null)} />}
    </div>
  );
}
