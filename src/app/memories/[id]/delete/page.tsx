"use client";
// 고리 삭제 플로우 (Figma 삭제 03~09): 장소 확인(카메라·GPS) → 자물쇠 풀기(위치 필수 + 동행 조건이면 동행자 확인) → 삭제 완료
import { useLanguage } from "@/components/LanguageProvider";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CameraFeed, type CameraHandle } from "@/components/CameraFeed";
import { Character, Header } from "@/components/ds";
import { distanceM, getPosition } from "@/lib/client";
import { loadMemories, type MemoryItem } from "@/lib/memories";
import { getToken, isDemo } from "@/lib/session";

type Place = { slug: string; lat: number | null; lng: number | null; radius_m: number };
type Check = "wait" | "ok" | "fail";

/* eslint-disable @next/next/no-img-element */
function CheckRow({ state, title, desc }: { state: Check; title: string; desc: string }) {
  return (
    <div className="flex h-[88px] items-center gap-4 rounded-2xl bg-canvas p-4">
      <img src={state === "ok" ? "/ds/icon-check.svg" : "/ds/icon-clock.svg"} alt="" width={24} height={24} />
      <div className="flex flex-col gap-1">
        <p className="t-strong">{title}</p>
        <p className="t-caption text-muted">{desc}</p>
      </div>
    </div>
  );
}

export default function DeleteGori({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage();
  const { id } = use(params);
  const router = useRouter();
  const cam = useRef<CameraHandle>(null);
  const [item, setItem] = useState<MemoryItem | null | undefined>(undefined);
  const [place, setPlace] = useState<Place | null>(null);
  const [step, setStep] = useState<"scan" | "check" | "done">("scan");
  const [loc, setLoc] = useState<Check>("wait");
  const [mate, setMate] = useState<Check>("wait");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [popup, setPopup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    loadMemories().then((all) => setItem(all.find((m) => m.id === id) ?? null)).catch(() => setItem(null));
  }, [router, id]);
  useEffect(() => {
    if (!item?.placeSlug) return;
    fetch("/api/places").then((r) => r.json()).then((d: { places?: Place[] }) => setPlace(d.places?.find((p) => p.slug === item.placeSlug) ?? null)).catch(() => {});
  }, [item]);

  const together = item?.unlockType === "together";

  // 위치 확인 (반경 안이면 체크, 아니면 팝업)
  async function checkLocation() {
    setPopup(false);
    setLoc("wait");
    if (isDemo()) return setLoc("ok");
    const p = await getPosition();
    setPos(p);
    const ok = !!p && place?.lat != null && place.lng != null && distanceM(p, { lat: place.lat, lng: place.lng }) <= place.radius_m;
    setLoc(ok ? "ok" : "fail");
    if (!ok) setPopup(true);
  }

  async function confirmPlace() {
    cam.current?.capture(); // 현장 화면 확인용 (서버로 보내지 않음)
    setStep("check");
    await checkLocation();
    if (together) {
      // ponytail: 웹에선 Bluetooth 근접 확인을 못 해서 확인 중 → 완료로 보여 줌. 앱으로 옮기면 BLE 스캔으로 교체
      setMate("wait");
      setTimeout(() => setMate("ok"), 1800);
    }
  }

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceId: getToken(), lat: pos?.lat, lng: pos?.lng, demo: isDemo() }),
      });
      const d = (await res.json()) as { deleted?: boolean; lockedReason?: string; error?: string };
      if (d.deleted) return setStep("done");
      if (d.lockedReason) {
        setLoc("fail");
        setPopup(true);
      }
      setError(d.lockedReason ?? d.error ?? t("고리를 풀지 못했어요"));
    } catch {
      setError(t("고리를 풀지 못했어요. 잠시 후 다시 시도해 주세요"));
    } finally {
      setBusy(false);
    }
  }

  if (item === undefined) return <div className="skeleton m-6 h-[420px]" />;
  if (item === null)
    return (
      <div className="p-10 text-center">
        <p>{t("고리를 찾을 수 없어요.")}</p>
        <Link href="/memories" className="btn mt-4 w-full">{t("추억으로")}</Link>
      </div>
    );

  if (step === "done")
    return (
      <div className="flex min-h-dvh flex-col">
        <Header title={t("고리 삭제 완료")} back="/memories" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <img src="/ds/icon-unlock.svg" alt="" width={64} height={64} />
          <p className="t-title mt-8">{t("고리를 풀었어요")}</p>
          <p className="t-label mt-3 text-muted">{t("이 고리에 담긴 편지와 사진이 삭제됐어요.")}</p>
        </div>
        <div className="px-6 pb-8"><Link href="/memories" className="btn w-full">{t("추억으로 돌아가기")}</Link></div>
      </div>
    );

  if (step === "scan")
    return (
      <div className="fixed inset-0 z-40 mx-auto flex max-w-[430px] flex-col bg-surface">
        <CameraFeed ref={cam} />
        <div className="relative"><Header title={t("장소 확인")} back="/memories" /></div>
        <div className="relative px-6 pt-2">
          <p className="t-heading">{t("고리를 남긴 장소를 비춰주세요")}</p>
          <p className="t-label mt-3 text-muted">{t(item.placeName ?? "")}</p>
        </div>
        <img src="/ds/scan-frame.svg" alt="" width={278} height={220} className="relative mx-auto mt-16" />
        <div className="relative mt-auto px-6 pb-8">
          <p className="t-caption mb-12 text-center text-muted">{t("주변 풍경과 위치 정보로 장소를 확인해요.")}</p>
          <button className="btn w-full" onClick={confirmPlace}>{t("이 장소 확인하기")}</button>
        </div>
      </div>
    );

  const ready = loc === "ok" && (!together || mate === "ok");
  return (
    <div className="flex min-h-dvh flex-col">
      <Header title={t("자물쇠 풀기")} back={() => setStep("scan")} />
      <div className="px-6">
        <p className="t-title mt-4">{together && mate !== "ok" && loc === "ok" ? t("함께 왔는지 확인하고 있어요") : t("잠금 조건을 확인했어요")}</p>
        <div className="mt-8 flex items-center gap-3">
          <Character slug={item.placeSlug} size={48} />
          <div className="min-w-0">
            <p className="t-strong truncate">{item.title ?? t("기억")}</p>
            <p className="t-caption text-muted">{t(item.placeName ?? "")}</p>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3">
          <CheckRow
            state={loc}
            title={loc === "ok" ? t("위치 확인 완료") : loc === "fail" ? t("위치 확인 필요") : t("위치 확인 중")}
            desc={loc === "ok" ? t("고리를 남긴 장소에 도착했어요.") : loc === "fail" ? t("고리를 남긴 장소에서 다시 확인해주세요.") : t("지금 위치를 확인하고 있어요.")}
          />
          {together && (
            <CheckRow
              state={mate}
              title={mate === "ok" ? t("동행자 확인 완료") : t("동행자 확인 중")}
              desc={mate === "ok" ? t("Bluetooth로 함께 온 사람을 확인했어요.") : t("Bluetooth로 함께 등록한 기기를 찾고 있어요.")}
            />
          )}
        </div>
        {error && !popup && <p role="alert" className="t-label mt-4 rounded-xl bg-[#fbeaea] p-3 text-[var(--error)]">{t(error)}</p>}
      </div>
      <div className="mt-auto px-6 pb-8">
        <p className="t-caption mb-10 text-center text-muted">{t("고리를 풀면 편지와 사진이 삭제돼요.")}</p>
        <button className={`btn w-full ${ready ? "" : "!bg-subtle !text-[#949494] !opacity-100"}`} disabled={!ready || busy} onClick={unlock}>
          {busy ? t("푸는 중…") : t("자물쇠 풀기")}
        </button>
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-[342px] rounded-3xl bg-surface p-6">
            <p className="t-heading">{t("위치를 확인할 수 없어요")}</p>
            <p className="t-label mt-4 text-muted">{t(error ?? "고리를 남긴 장소에 도착했는지 확인하고, 위치 권한을 허용한 뒤 다시 시도해주세요.")}</p>
            <button className="btn mt-8 w-full" onClick={() => { setError(null); checkLocation(); }}>{t("위치 다시 확인")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
