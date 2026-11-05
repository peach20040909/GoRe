"use client";
// 추억 상세: 기억 카드 + (잠김) 다시 와서 열기 → 위치·사진 판정 → 재회 리포트
import { useLanguage } from "@/components/LanguageProvider";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MemoryCard } from "@/components/MemoryCard";
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
  const c = item.card ?? {};
  const opened = item.status === "opened";

  return (
    <div className="pb-10">
      <Header title={t("추억")} back="/memories" />
      <div className="px-6">
      <p className="t-caption mt-2 text-muted">{t(item.placeName ?? "")} · {t(g?.name ?? "")}</p>
      <h1 className="t-title">{item.title ?? t("기억")}</h1>

      <div className="mt-4">
        <MemoryCard
          card={{ color: c.color ?? "#7FA7D9", shape: c.shape === "pair" ? "pair" : "single", pattern: c.pattern ?? "물결", glow: c.glow ?? 0.5 }}
          engraving={{ mine: c.engraving?.mine ?? "", ko: c.engraving?.ko ?? "" }}
          title={item.title ?? ""}
          placeName={t(item.placeName ?? "")}
          date={new Date(item.createdAt).toLocaleDateString(locale)}
          medium={g?.cardShape}
          className="mx-auto w-full max-w-xs"
        />
      </div>

      {opened ? (
        <section className="mt-6">
          {g && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={goriAsset(g.id).opened} alt={`${g.name} 개봉`} className="card aspect-square w-full object-cover" />
          )}
          {report && <p className="mt-4 rounded-xl bg-brand-soft p-4 text-sm leading-relaxed text-brand">{report}</p>}
          <p className="mt-4 text-xs text-muted">{t("{date}에 남긴 기억", { date: new Date(item.createdAt).toLocaleDateString(locale) })}</p>
          <p className="mt-1 whitespace-pre-wrap">{item.content}</p>
          {item.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={t("그날의 사진")} className="mt-3 w-full rounded-xl object-cover" />
          )}
          {item.photoUrl && c.photoCredit &&
            c.photoCredit.sourceUrl.startsWith("https://commons.wikimedia.org/") &&
            c.photoCredit.licenseUrl.startsWith("https://creativecommons.org/") && (
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("사진:")}<a className="underline" href={c.photoCredit.sourceUrl} target="_blank" rel="noreferrer">{c.photoCredit.author} / Wikimedia Commons</a>
              {" · "}<a className="underline" href={c.photoCredit.licenseUrl} target="_blank" rel="noreferrer">{c.photoCredit.license}</a>
              {t(" · 원본")}
            </p>
          )}
        </section>
      ) : (
        <section className="mt-6">
          {g && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={goriAsset(g.id).sealed} alt={`${g.name} 봉인`} className="card aspect-square w-full object-cover" />
          )}
          <p className="mt-4 font-bold">🔒 {t(item.unlockNote ?? "그 자리에 다시 오면 열려요")}</p>
          <p className="text-sm text-muted">{t("그 자리에서 지금 모습을 찍으면, 같은 자리인지 확인하고 열어 드려요.")}</p>
          <label className="btn mt-3 w-full cursor-pointer">
            {busy ? t("확인 중…") : t("다시 왔어요 · 열기")}
            <input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={(e) => unlock(e.target.files?.[0])} />
          </label>
          {msg && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{t(msg)}</p>}
        </section>
      )}
      </div>
    </div>
  );
}
