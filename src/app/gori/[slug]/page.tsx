"use client";
// 고리 플로우 (Figma MVP 제작용)
//  03 장소 확인(카메라 + GPS) → 07 모델 미리보기 → 08 사진과 편지 → (AI 기억 카드) → 09 열람 조건
//  → 10 AR 배치: "여기에 자물쇠 걸기"를 누르면 캐릭터가 걸어와 고리를 걸어 주고 저장 → 완료
import { useLanguage } from "@/components/LanguageProvider";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModelViewer } from "@/components/ModelViewer";
import { MemoryLetter } from "@/components/MemoryLetter";
import { CameraFeed, type CameraHandle } from "@/components/CameraFeed";
import { BottomNav, Header, MediaTile, OptionRow } from "@/components/ds";
import { api, browserLanguage, distanceM, getPosition, resizeImage } from "@/lib/client";
import { goriAsset, goriById } from "@/lib/goris";
import { characterLgFor, mediaFor, standFor } from "@/lib/media";
import { getToken, isDemo } from "@/lib/session";
import type { Draft } from "@/lib/prompts";

type Place = { slug: string; name_ko: string; lat: number | null; lng: number | null; radius_m: number };
type Step = "auth" | "model" | "write" | "unlock" | "ar" | "done";
const BACK: Partial<Record<Step, Step>> = { model: "auth", write: "model", unlock: "write", ar: "unlock" };
const UNLOCK_TITLE: Record<string, string> = { revisit: "이 장소에서 열기", together: "같이 열기", date: "정한 날에 열기", season: "그 계절이 오면 열기" };

// 받침 있으면 "이", 없으면 "가" (경복궁이 / 홍제폭포가). 한글이 아니면 "가"
const ga = (word: string) => {
  const c = word.trim().charCodeAt(word.trim().length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "이" : "가";
};

/* eslint-disable @next/next/no-img-element */
export default function GoriFlow({ params }: { params: Promise<{ slug: string }> }) {
  const { t, locale } = useLanguage();
  const { slug } = use(params);
  const router = useRouter();
  const gori = goriById(mediaFor(slug).goriId)!;
  const asset = goriAsset(gori.id);
  const stand = standFor(slug);
  const cam = useRef<CameraHandle>(null);
  const [demo, setDemo] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<{ title: string; desc: string } | null>(null); // 장소 확인 실패 경고 팝업
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
      const name = t(place?.name_ko ?? gori.place);
      const notHere = t("여기는 {place}{ga} 아니에요!", { place: name, ga: ga(name) });
      if (!demo) {
        if (place?.lat == null || place.lng == null) throw new Error(t("이 장소의 고정 지점이 아직 없어요"));
        const pos = await getPosition();
        if (!pos) return setWarn({ title: t("위치를 확인할 수 없어요"), desc: t("위치 권한을 허용한 뒤 다시 시도해 주세요.") });
        const d = Math.round(distanceM(pos, { lat: place.lat, lng: place.lng }));
        if (d > place.radius_m)
          return setWarn({ title: notHere, desc: t("{place}에서 {distance}m 떨어져 있어요. {radius}m 안으로 와서 다시 찍어 주세요.", { place: name, distance: d, radius: place.radius_m }) });
      }
      // 사진 인식: 다른 등록 장소로 또렷하게 보이면 막고 경고. 알아보기 어려운 사진(실내 등)은 GPS를 믿고 통과
      const seen = await api<{ slug: string | null; confidence: number }>("/api/places/identify", { imageDataUrl: img }).catch(() => null);
      if (!demo && seen?.slug && seen.slug !== slug && seen.confidence >= 0.6)
        return setWarn({ title: notHere, desc: t("사진 속 풍경이 이 장소와 달라 보여요. 그 자리를 비추고 다시 찍어 주세요.") });
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
      await wait(stand ? 2900 : 1500); // 거치대 '고리 걸기' 애니메이션 길이(약 2.8초)만큼 기다림
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
          {/* 카메라 화면 위 안내 문구: 홈 지도 제목처럼 위에서 아래로 투명해지는 그라데이션 위에 띄움 */}
          <div className="pointer-events-none relative bg-gradient-to-b from-white/95 via-white/75 to-transparent px-6 pb-12 pt-4">
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
          <input id="auth-file" type="file" accept="image/*" capture="environment" hidden onChange={(e) => { verify(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <BottomNav active="gori" />
        {/* 장소 확인 실패 경고: "여기는 ○○가 아니에요!" */}
        {warn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" role="alertdialog" aria-modal="true" aria-labelledby="warn-title">
            <div className="w-full max-w-[342px] rounded-3xl bg-surface p-6 text-center shadow-xl">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fbeaea] text-3xl" aria-hidden>⚠️</div>
              <p id="warn-title" className="t-heading mt-4 text-[var(--error)]">{warn.title}</p>
              <p className="t-label mt-3 text-muted">{warn.desc}</p>
              <button className="btn mt-6 w-full" onClick={() => setWarn(null)}>{t("다시 찍기")}</button>
            </div>
          </div>
        )}
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
        {stand ? (
          /* 장소 거치대: 처음부터 서 있고, 고리를 걸 때 거치대의 '고리 걸기' 애니메이션이 한 번 재생됨. AR 버튼으로 실물 크기로 놓아 볼 수 있음 */
          <div className="absolute inset-x-0 top-[8%] h-[440px]">
            <ModelViewer
              src={stand.glb}
              iosSrc={stand.usdz}
              alt={`${placeName} · ${t("고리 거치대")}`}
              arEnabled={false} // 휴대폰 기본 AR 뷰어(Quick Look 등)는 캐릭터·고리 걸기 연출을 못 보여 줘서, 이 카메라 화면을 AR로 씀
              play={hang === "hang" || hang === "leave"}
              orbit="0deg 82deg 88%"
              style={{ height: 440, background: "transparent" }}
            />
          </div>
        ) : (
          /* 거치대가 없는 장소: 고리가 위에서 내려와 흔들리며 걸림 */
          <div
            className="absolute inset-x-0 top-[14%] h-[220px] transition-all duration-700"
            style={{ opacity: hang === "hang" || hang === "leave" ? 1 : 0, transform: `translateY(${hang === "hang" || hang === "leave" ? 0 : -120}px)` }}
          >
            <div className={hang === "hang" ? "animate-[swing_1.2s_ease-out]" : ""} style={{ transformOrigin: "50% 0" }}>
              <ModelViewer src={asset.model} alt={t(gori.name)} arEnabled={false} style={{ height: 220, background: "transparent" }} />
            </div>
          </div>
        )}
        {/* 캐릭터: 왼쪽 아래에서 엿보다가 → 가운데로 걸어와 고리를 걸고 → 오른쪽으로 퇴장 */}
        <img
          src={characterLgFor(slug)}
          alt=""
          className={`pointer-events-none absolute transition-all ease-in-out ${stand ? "h-[150px]" : "h-[270px]"}`}
          style={{
            top: hang === "idle" ? (stand ? "60%" : "52%") : stand ? "56%" : "44%",
            left: hang === "idle" ? (stand ? -30 : -55) : hang === "leave" ? "110%" : stand ? "22%" : "50%", // 거치대가 있으면 그 앞 왼쪽 바닥에, 거치대에 맞는 크기로 섬
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
          <MemoryLetter title={draft.title} body={content} place={placeName} placeSlug={slug} date={new Date().toLocaleDateString(locale)} coverImage={asset.sealed} photoUrl={photo ?? photo2} readable className="mx-auto mt-2 w-full max-w-[342px]" />
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
          <MemoryLetter title={draft.title} body={content} place={placeName} placeSlug={slug} date={new Date().toLocaleDateString(locale)} coverImage={asset.sealed} photoUrl={photo ?? photo2} readable className="mx-auto mt-2 w-full max-w-[342px]" />
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
