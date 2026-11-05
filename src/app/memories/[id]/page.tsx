"use client";
// 추억 상세: 기억 카드 + (잠김) 다시 와서 열기 → 위치·사진 판정 → 재회 리포트
import { useLanguage } from "@/components/LanguageProvider";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemoryLetter } from "@/components/MemoryLetter";
import { Header } from "@/components/ds";
import { api, browserLanguage, getPosition, resizeImage } from "@/lib/client";
import { goriAsset, goriById } from "@/lib/goris";
import { loadMemories, type MemoryItem } from "@/lib/memories";
import { getToken, isDemo } from "@/lib/session";

type RevisitRes = { opened: boolean; lockedReason?: string; reason?: string; reunionReport?: string | null };

export default function MemoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = useLanguage();
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<MemoryItem | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showAfterUnlock, setShowAfterUnlock] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const reload = () => loadMemories().then((all) => setItem(all.find((m) => m.id === id) ?? null));
  useEffect(() => {
    if (!getToken()) return router.replace("/login");
    reload().catch(() => setItem(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function unlock(file?: File) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const demo = isDemo();
      const [photo, pos] = await Promise.all([resizeImage(file), demo ? Promise.resolve(null) : getPosition()]);
      const r = await api<RevisitRes>(`/api/memories/${id}/revisit`, {
        deviceId: getToken(), language: browserLanguage(), photoDataUrl: photo, lat: pos?.lat, lng: pos?.lng, demo,
      });
      if (r.opened) {
        setReport(r.reunionReport ?? null);
        await reload();
        setShowAfterUnlock(true);
      } else setMsg(r.lockedReason ?? r.reason ?? t("아직 열 수 없어요"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("열지 못했어요"));
    } finally {
      setBusy(false);
    }
  }

  if (item === undefined) return <div className="skeleton mx-auto mt-10 max-w-md" style={{ height: 420 }} />;
  if (item === null)
    return (
      <div className="mx-auto max-w-md pt-10 text-center">
        <p>{t("기억을 찾을 수 없어요.")}</p>
        <Link href="/memories" className="btn mt-4">{t("추억으로")}</Link>
      </div>
    );

  const g = goriById(item.medium);
  const opened = item.status === "opened";

  return (
    <div className="pb-10">
      <Header title={t("기억의 편지")} back="/memories" />
      <div className="px-6">
        <p className="t-caption mb-3 mt-2 text-muted">{t("이곳에 남긴 기억")}</p>
        <MemoryLetter key={item.id} title={item.title ?? t("기억")} body={opened ? item.content : null}
          place={t(item.placeName ?? "")} placeSlug={item.placeSlug} date={new Date(item.createdAt).toLocaleDateString(locale)}
          coverImage={goriAsset(g?.id ?? "myongji-horse").sealed}
          photoUrl={opened ? item.photoUrl : null} photoCredit={opened ? item.card?.photoCredit : undefined}
          readable={opened} initiallyOpen={showAfterUnlock} onRequestUnlock={() => { if (!busy) inputRef.current?.click(); }} />
        {opened ? <>
          <p className="t-caption mt-4 text-muted">{t("그날의 사진과 기억을 한 장의 편지에 담았어요.")}</p>
          {report && <p className="mt-4 rounded-xl bg-brand-soft p-4 text-sm leading-relaxed text-brand">{report}</p>}
          <Link href="/memories" className="btn mt-6 w-full">{t("확인")}</Link>
        </> : <section className="mt-6">
          <p className="font-bold">🔒 {t(item.unlockNote ?? "그 자리에 다시 오면 열려요")}</p>
          <p className="text-sm text-muted">{t("그 자리에서 지금 모습을 찍으면, 같은 자리인지 확인하고 열어 드려요.")}</p>
          <label className="btn mt-3 w-full cursor-pointer">
            {busy ? t("확인 중…") : t("다시 왔어요 · 열기")}
            <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={(e) => { unlock(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {msg && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{t(msg)}</p>}
        </section>}
      </div>
    </div>
  );
}
