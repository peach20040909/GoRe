"use client";
// 고리 플로우: ① GPS 확인·현장 촬영 → 위치·사진 인증
//             ② 자물쇠 만들기: 3D 고리 → 사진·내용 등록 → (AI) 기억 카드 → 해금 조건 설정
//             ③ AR 환경 진입 → 배치 → 저장 → 완료
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModelViewer } from "@/components/ModelViewer";
import { MemoryCard } from "@/components/MemoryCard";
import { api, browserLanguage, distanceM, getPosition, resizeImage, type LatLng } from "@/lib/client";
import { goriAsset, goriById } from "@/lib/goris";
import { mediaFor } from "@/lib/media";
import { getToken, isDemo } from "@/lib/session";
import type { Draft } from "@/lib/prompts";

type Place = { slug: string; name_ko: string; lat: number | null; lng: number | null; radius_m: number };
type Step = "auth" | "write" | "unlock" | "ar" | "done";

export default function GoriFlow({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const media = mediaFor(slug);
  const gori = goriById(media.goriId)!;
  const [demo, setDemo] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [step, setStep] = useState<Step>("auth");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [draft, setDraft] = useState<(Draft & { mocked?: boolean }) | null>(null);
  const [unlockIdx, setUnlockIdx] = useState(0);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    setDemo(isDemo());
    fetch("/api/places")
      .then((r) => r.json())
      .then((d: { places?: Place[] }) => setPlace(d.places?.find((p) => p.slug === slug) ?? null));
  }, [router, slug]);

  // ① 위치·사진 인증
  async function onAuthPhoto(file?: File) {
    if (!file) return;
    setError(null);
    setBusy("위치와 사진을 확인하고 있어요…");
    try {
      const img = await resizeImage(file);
      setPhoto(img);
      if (!demo) {
        if (place?.lat == null || place.lng == null) throw new Error("이 장소의 고정 지점이 아직 없어요");
        const pos: LatLng | null = await getPosition();
        if (!pos) throw new Error("위치 권한을 허용해야 인증할 수 있어요");
        const d = Math.round(distanceM(pos, { lat: place.lat, lng: place.lng }));
        if (d > place.radius_m) throw new Error(`${place.name_ko}에서 ${d}m 떨어져 있어요. ${place.radius_m}m 안으로 와 주세요`);
      }
      const r = await api<{ slug: string | null; confidence: number }>("/api/places/identify", { imageDataUrl: img });
      setAuthNote(r.slug === slug ? "그 자리 확인 완료" : "근처에서 인증됐어요");
      setStep("write");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  // ② 사진·내용 등록 → AI 기억 카드 + 해금 조건 후보
  async function makeCard() {
    if (!content.trim()) return setError("기억을 한 줄 이상 남겨 주세요");
    setError(null);
    setBusy("기억을 읽고 카드를 빚고 있어요…");
    try {
      const d = await api<Draft & { mocked?: boolean }>("/api/memories/draft", {
        placeSlug: slug, content, language: browserLanguage(), photoDataUrl: photo ?? undefined,
      });
      setDraft(d);
      setUnlockIdx(0);
      setStep("unlock");
    } catch (e) {
      setError(e instanceof Error ? e.message : "카드를 만들지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  // ③ 저장
  async function save() {
    if (!draft) return;
    const opt = draft.unlockOptions[unlockIdx];
    setError(null);
    setBusy("이 자리에 고리를 걸고 있어요…");
    try {
      await api("/api/memories", {
        deviceId: getToken(), language: browserLanguage(), placeSlug: slug, medium: gori.id, content,
        photoDataUrl: photo ?? undefined, visibility: isPublic ? "public_anonymous" : "private",
        draft, unlockType: opt.type, unlockAt: opt.unlockAt, unlockNote: opt.note,
      });
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  const today = new Date().toLocaleDateString("ko-KR");
  const card = draft && (
    <MemoryCard
      card={draft.card}
      engraving={draft.engraving}
      title={draft.title}
      placeName={place?.name_ko ?? gori.place}
      date={today}
      medium={gori.cardShape}
      className="mx-auto w-full max-w-xs"
    />
  );

  return (
    <div className="mx-auto max-w-md pb-10 pt-6">
      <Link href="/" className="text-sm text-muted">← 홈</Link>
      <p className="mt-3 text-sm font-semibold text-brand">{place?.name_ko ?? gori.place}{demo && " · 시연 모드"}</p>
      <h1 className="text-2xl font-extrabold">{gori.name}</h1>

      {step === "auth" && (
        <section className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={goriAsset(gori.id).sealed} alt={`${gori.name} 봉인`} className="card aspect-square w-full object-cover" />
          {gori.placeSlug === slug && <p className="mt-3 text-sm">{gori.description}</p>}
          <p className="mt-4 font-bold">1. 지금 이 자리를 찍어 주세요</p>
          <p className="text-sm text-muted">위치와 사진으로 그 자리에 왔는지 확인해요.</p>
          <label className="btn mt-3 w-full cursor-pointer">
            현장 촬영하기
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onAuthPhoto(e.target.files?.[0])} />
          </label>
        </section>
      )}

      {step === "write" && (
        <section className="mt-4">
          <p className="rounded-xl bg-brand-soft px-4 py-2 text-sm text-brand">✓ {authNote}</p>
          <div className="card mt-3 overflow-hidden"><ModelViewer src={goriAsset(gori.id).model} alt={gori.name} arEnabled={false} /></div>
          <p className="mt-4 font-bold">2. 이 고리에 담을 기억</p>
          <textarea
            className="card mt-2 h-32 w-full p-3"
            placeholder="어떤 언어로든 괜찮아요. 오늘 이 자리에서 남기고 싶은 말을 적어 주세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
          />
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="함께 담을 사진" className="mt-2 h-24 w-24 rounded-xl object-cover" />
          )}
          <label className="mt-2 inline-block cursor-pointer text-sm underline">
            사진 바꾸기
            <input type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && setPhoto(await resizeImage(e.target.files[0]))} />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            이름·연락처를 지운 한 줄로 이 장소의 기억 벽에 남기기
          </label>
          <button className="btn mt-4 w-full" onClick={makeCard} disabled={!!busy}>기억 카드 만들기</button>
        </section>
      )}

      {step === "unlock" && draft && (
        <section className="mt-4">
          {card}
          <p className="mt-4 font-bold">3. 언제 다시 열까요?</p>
          <div className="mt-2 flex flex-col gap-2">
            {draft.unlockOptions.map((o, i) => (
              <label key={i} className={`card flex cursor-pointer gap-3 p-3 ${i === unlockIdx ? "border-brand" : ""}`}>
                <input type="radio" name="unlock" checked={i === unlockIdx} onChange={() => setUnlockIdx(i)} />
                <span className="text-sm">{o.note}</span>
              </label>
            ))}
          </div>
          <button className="btn mt-4 w-full" onClick={() => setStep("ar")}>이 조건으로 잠그기</button>
        </section>
      )}

      {step === "ar" && (
        <section className="mt-4">
          <p className="font-bold">4. 이 자리에 고리를 걸어 주세요</p>
          <p className="text-sm text-muted">휴대폰에서 ‘AR로 이 자리에 놓아 보기’를 누르면 실제 공간에 고리를 놓을 수 있어요.</p>
          <div className="card mt-3 overflow-hidden"><ModelViewer src={goriAsset(gori.id).model} alt={gori.name} /></div>
          <button className="btn mt-4 w-full" onClick={save} disabled={!!busy}>이 자리에 걸고 저장하기</button>
        </section>
      )}

      {step === "done" && (
        <section className="mt-4 text-center">
          {card}
          <h2 className="mt-4 text-xl font-extrabold">고리를 걸었어요</h2>
          <p className="mt-1 text-sm text-muted">{draft?.unlockOptions[unlockIdx]?.note}</p>
          <div className="mt-6 flex gap-2">
            <Link href="/memories" className="btn flex-1">추억 보기</Link>
            <Link href="/" className="btn btn-ghost flex-1">홈으로</Link>
          </div>
        </section>
      )}

      {busy && <p className="mt-4 text-center text-sm text-muted">{busy}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
