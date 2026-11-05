"use client";
// 고리 플로우 (Figma MVP 제작용)
//  03 장소 확인(카메라 + GPS) → 07 모델 미리보기 → 08 사진과 편지 → (AI 기억 카드) → 09 열람 조건
//  → 10 AR 배치: "여기에 자물쇠 걸기"를 누르면 캐릭터가 걸어와 고리를 걸어 주고 저장 → 완료
import { useLanguage } from "@/components/LanguageProvider";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModelViewer } from "@/components/ModelViewer";
import { MemoryCard } from "@/components/MemoryCard";
import { CameraFeed, type CameraHandle } from "@/components/CameraFeed";
import { BottomNav, Header, MediaTile, OptionRow } from "@/components/ds";
import { api, browserLanguage, distanceM, getPosition, resizeImage } from "@/lib/client";
import { goriAsset, goriById } from "@/lib/goris";
import { characterLgFor, mediaFor } from "@/lib/media";
import { getToken, isDemo } from "@/lib/session";
import type { Draft } from "@/lib/prompts";

type Place = { slug: string; name_ko: string; lat: number | null; lng: number | null; radius_m: number };
type Step = "auth" | "model" | "write" | "unlock" | "ar" | "done";
const BACK: Partial<Record<Step, Step>> = { model: "auth", write: "model", unlock: "write", ar: "unlock" };
const UNLOCK_TITLE: Record<string, string> = { revisit: "이 장소에서 열기", together: "같이 열기", date: "정한 날에 열기", season: "그 계절이 오면 열기" };

/* eslint-disable @next/next/no-img-element */
export default function GoriFlow({ params }: { params: Promise<{ slug: string }> }) {
  const { t, locale } = useLanguage();
  const { slug } = use(params);
  const router = useRouter();
  const gori = goriById(mediaFor(slug).goriId)!;
  const asset = goriAsset(gori.id);
  const cam = useRef<CameraHandle>(null);
  const [demo, setDemo] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [draft, setDraft] = useState<(Draft & { mocked?: boolean }) | null>(null);
  const [unlockIdx, setUnlockIdx] = useState(0);
  const [hang, setHang] = useState<"idle" | "walk" | "hang" | "leave">("idle");

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    setDemo(isDemo());
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: Place[] }) => setPlace(d.places?.find((p) => p.slug === slug) ?? null))
      .catch(() => {});
  }, [router, slug]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo(0, 0);
  };
  const placeName = t(place?.name_ko ?? gori.place);

  // 03 위치·사진 인증 (카메라 화면을 찍거나, 카메라가 없으면 파일)
  async function verify(file?: File) {
    setError(null);
    setBusy(t("위치와 사진을 확인하고 있어요…"));
    try {
      const img = file ? await resizeImage(file) : cam.current?.capture();
      if (!img) throw new Error(t("카메라를 쓸 수 없어요. 사진을 골라 주세요"));
      setPhoto(img);
      if (!demo) {
        if (place?.lat == null || place.lng == null) throw new Error(t("이 장소의 고정 지점이 아직 없어요"));
        const pos = await getPosition();
        if (!pos) throw new Error(t("위치 권한을 허용해야 고리를 걸 수 있어요"));
        const d = Math.round(distanceM(pos, { lat: place.lat, lng: place.lng }));
        if (d > place.radius_m) throw new Error(t("{place}에서 {distance}m 떨어져 있어요. {radius}m 안으로 와 주세요", {place: t(place.name_ko), distance: d, radius: place.radius_m}));
      }
      await api("/api/places/identify", { imageDataUrl: img }).catch(() => null); // 장소 인식은 참고용
      go("model");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("인증하지 못했어요"));
    } finally {
      setBusy(null);
    }
  }

  // 08 → AI 기억 카드 + 해금 조건 후보
  async function makeCard() {
    if (!content.trim()) return setError(t("편지를 한 줄 이상 적어 주세요"));
    setError(null);
    setBusy(t("편지를 읽고 기억 카드를 만들고 있어요…"));
    try {
      const d = await api<Draft & { mocked?: boolean }>("/api/memories/draft", {
        placeSlug: slug, content, language: browserLanguage(), photoDataUrl: photo ?? undefined,
      });
      setDraft(title.trim() ? { ...d, title: title.trim() } : d);
      setUnlockIdx(Math.max(0, d.unlockOptions.findIndex((o) => o.type === "revisit")));
      go("unlock");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("카드를 만들지 못했어요"));
    } finally {
      setBusy(null);
    }
  }

  // 10 여기에 자물쇠 걸기: 캐릭터 애니메이션과 저장을 같이 진행
  async function hangLock() {
    if (!draft || hang !== "idle") return;
    const opt = draft.unlockOptions[unlockIdx];
    setError(null);
    setHang("walk");
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const save = api("/api/memories", {
      deviceId: getToken(), language: browserLanguage(), placeSlug: slug, medium: gori.id, content,
      photoDataUrl: photo ?? photo2 ?? undefined, visibility: isPublic ? "public_anonymous" : "private",
      draft, unlockType: opt.type, unlockAt: opt.unlockAt, unlockNote: opt.note,
    });
    try {
      await wait(1100);
      setHang("hang");
      await wait(1500);
      setHang("leave");
      await Promise.all([save, wait(900)]);
      go("done");
    } catch (e) {
      setHang("idle");
      setError(e instanceof Error ? e.message : t("저장하지 못했어요"));
    }
  }

  const back = BACK[step];
  const errorBox = error && <p role="alert" className="t-label mx-6 mt-3 rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{t(error)}</p>;

  /* 03 고리 · 장소 확인 */
  if (step === "auth")
    return (
      <div className="relative min-h-dvh">
        <Header title={t("고리")} />
        <div className="relative mx-0 h-[calc(100dvh-56px-92px-76px)] min-h-[360px]">
          <CameraFeed ref={cam} />
          {/* 카메라 화면 위 안내 문구: 반투명 흐림 판 위에 띄움 */}
          <div className="relative bg-white/70 px-6 pb-4 pt-4 backdrop-blur-md">
            <p className="t-heading">{t("이 장소에 고리를 걸어요")}</p>
            <p className="t-label mt-2 text-muted">{t("카메라로 지금 머무는 장소를 비춰주세요.")}</p>
          </div>
          {errorBox}
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#fdfdfd] px-6 py-5">
          <div className="min-w-0">
            <p className="t-strong">{t("현재 장소 ·")}{placeName}{demo && t(" (시연)")}</p>
            <p className="t-caption text-muted">{t("확인한 장소에 사진과 편지를 보관해요.")}</p>
          </div>
          <button className="btn shrink-0 text-sm" disabled={!!busy} onClick={() => (cam.current?.live ? verify() : document.getElementById("auth-file")?.click())}>
            {busy ? t("확인 중…") : t("자물쇠 걸기")}
          </button>
          <input id="auth-file" type="file" accept="image/*" capture="environment" hidden onChange={(e) => verify(e.target.files?.[0])} />
        </div>
        <BottomNav active="gori" />
      </div>
    );

  /* 10 AR 배치 */
  if (step === "ar")
    return (
      <div className="fixed inset-0 z-40 mx-auto max-w-[430px] overflow-hidden bg-surface">
        <CameraFeed />
        <div className="relative">
          <Header title={`${placeName} · AR`} back={hang === "idle" ? () => go("unlock") : undefined} />
        </div>
        {/* 걸린 고리 */}
        <div
          className="absolute inset-x-0 top-[14%] h-[220px] transition-all duration-700"
          style={{ opacity: hang === "hang" || hang === "leave" ? 1 : 0, transform: `translateY(${hang === "hang" || hang === "leave" ? 0 : -120}px)` }}
        >
          <div className={hang === "hang" ? "animate-[swing_1.2s_ease-out]" : ""} style={{ transformOrigin: "50% 0" }}>
            <ModelViewer src={asset.model} alt={t(gori.name)} arEnabled={false} style={{ height: 220, background: "transparent" }} />
          </div>
        </div>
        {/* 캐릭터: 왼쪽 아래에서 엿보다가 → 가운데로 걸어와 고리를 걸고 → 오른쪽으로 퇴장 */}
        <img
          src={characterLgFor(slug)}
          alt=""
          className="pointer-events-none absolute h-[270px] transition-all ease-in-out"
          style={{
            top: hang === "idle" ? "52%" : "44%",
            left: hang === "idle" ? -55 : hang === "leave" ? "110%" : "50%",
            transform: `translateX(${hang === "idle" ? 0 : "-50%"}) ${hang === "walk" ? "rotate(-4deg)" : ""}`,
            transitionDuration: hang === "leave" ? "900ms" : "1100ms",
            animation: hang === "idle" ? "peek 2.4s ease-in-out infinite" : hang === "hang" ? "hop .5s ease-out 2" : undefined,
          }}
        />
        <div className="absolute inset-x-6 bottom-[92px]">
          <p className="t-label rounded-xl bg-surface/90 p-3 text-center text-muted">
            {hang === "idle" ? t("공간을 비추고 놓을 위치로 이동해주세요") : hang === "walk" ? t("고리를 들고 가는 중…") : t("찰칵! 이 자리에 고리를 걸었어요")}
          </p>
          {error && <p role="alert" className="t-label mt-2 rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{t(error)}</p>}
        </div>
        <button className="btn absolute inset-x-6 bottom-6" onClick={hangLock} disabled={hang !== "idle"}>{t("여기에 자물쇠 걸기")}</button>
        <style>{`
          @keyframes peek { 0%,100% { transform: translateX(0) rotate(0) } 50% { transform: translateX(14px) rotate(3deg) } }
          @keyframes hop { 0%,100% { translate: 0 0 } 40% { translate: 0 -24px } }
          @keyframes swing { 0% { rotate: -14deg } 35% { rotate: 9deg } 65% { rotate: -4deg } 100% { rotate: 0 } }
        `}</style>
      </div>
    );

  return (
    <div className="min-h-dvh pb-8">
      {step !== "done" && <Header title={{ model: t("모델 미리보기"), write: t("사진과 편지"), unlock: t("열람 조건") }[step as "model"]} back={back && (() => go(back))} />}

      {/* 07 모델 미리보기 */}
      {step === "model" && (
        <section className="px-6">
          <p className="t-title mt-2">{t("이 고리를 걸어요")}</p>
          <p className="t-body text-muted">{t(gori.name)} · {placeName}</p>
          <div className="mx-auto my-8 size-[280px] overflow-hidden rounded-[61px] bg-canvas">
            <ModelViewer src={asset.model} alt={t(gori.name)} arEnabled={false} style={{ height: 280, background: "var(--surface-canvas)" }} />
          </div>
          <div className="rounded-[13px] bg-canvas p-4">
            <p className="t-strong">{t(gori.name)} · {t(gori.place)}</p>
            <p className="t-caption mt-2">{t(gori.description)}</p>
          </div>
          <button className="btn mt-8 w-full" onClick={() => go("write")}>{t("선택하기")}</button>
        </section>
      )}

      {/* 08 사진과 편지 */}
      {step === "write" && (
        <section className="px-6">
          <div className="relative mt-4 rounded-lg bg-[var(--surface-letter-paper)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <img src="/ds/paper-corner.svg" alt="" width={24} height={24} className="absolute right-0 top-0" />
            <p className="t-caption text-muted">{t("이곳에 남기는 편지")}</p>
            <input
              className="t-heading mt-4 w-full bg-transparent outline-none placeholder:text-faint"
              placeholder={t("편지 제목 (비우면 AI가 지어요)")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
            />
            <div className="mt-3 h-px bg-line opacity-60" />
            <textarea
              className="mt-4 h-40 w-full resize-none bg-transparent text-base leading-7 outline-none placeholder:text-faint"
              placeholder={t("어떤 언어로든 괜찮아요. 오늘 이 자리에서 남기고 싶은 말을 적어 주세요.")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
            />
            <p className="t-caption text-faint">{t("소중한 순간을 고리에 담아요")}</p>
          </div>
          <p className="t-label mt-7">{t("함께 남길 사진")}</p>
          <div className="mt-3 flex gap-3">
            <MediaTile src={photo} label={t("사진 추가")} onFile={async (f) => setPhoto(await resizeImage(f))} />
            <MediaTile src={photo2} label={t("사진 추가")} onFile={async (f) => setPhoto2(await resizeImage(f))} />
          </div>
          {error && <p role="alert" className="t-label mt-3 rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{t(error)}</p>}
          <button className="btn mt-8 w-full" onClick={makeCard} disabled={!!busy}>{busy ? t("기억 카드를 만드는 중…") : t("저장하기")}</button>
        </section>
      )}

      {/* 09 열람 조건 (+ AI가 만든 기억 카드) */}
      {step === "unlock" && draft && (
        <section className="px-6">
          <MemoryCard card={draft.card} engraving={draft.engraving} title={draft.title} placeName={placeName} date={new Date().toLocaleDateString(locale)} medium={gori.cardShape} className="mx-auto mt-2 w-full max-w-[240px]" />
          <p className="t-sub mt-6">{t("내용 공개 범위")}</p>
          <div className="mt-4 flex flex-col gap-4" role="radiogroup">
            <OptionRow title={t("나만 보기")} desc={t("나에게만 편지와 사진이 보여요.")} selected={!isPublic} onSelect={() => setIsPublic(false)} />
            <OptionRow title={t("이 장소의 기억 벽에 남기기")} desc={t("이름·연락처를 지운 한 줄만 다른 방문자에게 보여요.")} selected={isPublic} onSelect={() => setIsPublic(true)} />
          </div>
          <p className="t-sub mt-10">{t("열 수 있는 조건")}</p>
          <div className="mt-4 flex flex-col gap-4" role="radiogroup">
            {draft.unlockOptions.map((o, i) => (
              <OptionRow key={i} title={UNLOCK_TITLE[o.type] ?? t("다시 열기")} desc={o.note} selected={i === unlockIdx} onSelect={() => setUnlockIdx(i)} />
            ))}
          </div>
          <p className="t-caption mt-10 text-center text-muted">{t("자물쇠 외형과 편지·사진의 공개 범위는 구분돼요.")}</p>
          <button className="btn mt-4 w-full" onClick={() => go("ar")}>{t("저장하기")}</button>
        </section>
      )}

      {/* 완료 */}
      {step === "done" && draft && (
        <section className="px-6 pt-10 text-center">
          <MemoryCard card={draft.card} engraving={draft.engraving} title={draft.title} placeName={placeName} date={new Date().toLocaleDateString(locale)} medium={gori.cardShape} className="mx-auto w-full max-w-[260px]" />
          <p className="t-title mt-6">{t("고리를 걸었어요")}</p>
          <p className="t-label mt-2 text-muted">{t(draft.unlockOptions[unlockIdx]?.note ?? "")}</p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/memories" className="btn w-full">{t("추억 보기")}</Link>
            <Link href="/" className="btn btn-ghost w-full">{t("홈으로")}</Link>
          </div>
        </section>
      )}
    </div>
  );
}
