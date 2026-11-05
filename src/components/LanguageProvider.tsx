"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isLanguage, LANGUAGE_KEY, LANGUAGES, LOCALES, preferredLanguage, rememberLanguage, type Language } from "@/lib/language";
import { translate } from "@/lib/translations";

type Context = { language: Language; setLanguage: (language: Language) => void; t: (source: string, values?: Record<string, string | number>) => string; locale: string };
const LanguageContext = createContext<Context>({ language: "ko", setLanguage: () => {}, t: (source) => source, locale: "ko-KR" });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>("ko");
  useEffect(() => {
    updateLanguage(preferredLanguage());
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY || event.key === null) {
        rememberLanguage(isLanguage(event.newValue) ? event.newValue : null, false);
        updateLanguage(preferredLanguage());
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-CN" : language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    rememberLanguage(next);
  }, []);
  const t = useCallback((source: string, values?: Record<string, string | number>) => translate(language, source, values), [language]);
  const value = useMemo(() => ({ language, setLanguage, t, locale: LOCALES[language] }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

const LABELS: Record<Language, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
const SUBTITLES: Record<Language, string> = { ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese · 简体" };
export function LanguageSwitcher({ inverse = false }: { inverse?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const menuId = useId();
  const close = useCallback(() => { setAnchor(null); trigger.current?.focus(); }, []);
  useEffect(() => {
    if (!anchor) return;
    options.current[LANGUAGES.indexOf(language)]?.focus();
    const dismiss = () => setAnchor(null);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => { window.removeEventListener("resize", dismiss); window.removeEventListener("scroll", dismiss, true); };
  }, [anchor, language]);
  return (
    <>
      <button ref={trigger} type="button" aria-label="Language / 언어 / 言語 / 语言" aria-haspopup="menu" aria-expanded={!!anchor} aria-controls={anchor ? menuId : undefined}
        onClick={() => {
          if (anchor) return close();
          const rect = trigger.current?.getBoundingClientRect();
          if (rect) setAnchor({ top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - 262)), left: Math.max(16, Math.min(rect.right - 200, window.innerWidth - 216)) });
        }}
        className={`ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${inverse ? "border-white/30 bg-white/10 text-white hover:bg-white/20" : "border-line bg-canvas text-text hover:bg-subtle"}`}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
        <span>{LABELS[language]}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className={anchor ? "rotate-180" : ""}><path d="m4 6 4 4 4-4"/></svg>
      </button>
      {anchor && createPortal(
        <>
          <div className="fixed inset-0 z-[80]" aria-hidden="true" onPointerDown={close} />
          <div id={menuId} role="menu" aria-label="Language / 언어 / 言語 / 语言" className="fixed z-[90] w-[200px] rounded-[18px] border border-line bg-surface p-1.5 shadow-[0_12px_40px_rgba(36,39,56,0.16)]" style={anchor}
            onKeyDown={(event) => {
              const current = options.current.findIndex((option) => option === document.activeElement);
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
              if (event.key === "Tab") close();
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next = event.key === "Home" ? 0 : event.key === "End" ? LANGUAGES.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + LANGUAGES.length) % LANGUAGES.length;
                options.current[next]?.focus();
              }
            }}>
            <p className="px-2.5 pb-1.5 pt-1.5 text-[10px] font-semibold tracking-wide text-faint">{t("언어")}{t("언어") !== "Language" && <span className="ml-1 font-normal">/ Language</span>}</p>
            {LANGUAGES.map((code, index) => {
              const selected = code === language;
              return <button key={code} ref={(element) => { options.current[index] = element; }} type="button" role="menuitemradio" aria-checked={selected} tabIndex={-1} onClick={() => { setLanguage(code); close(); }}
                className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${selected ? "bg-subtle text-accent" : "text-text"}`}>
                <span className={`flex size-[30px] shrink-0 items-center justify-center rounded-[10px] text-[10px] font-bold uppercase ${selected ? "bg-accent text-white" : "bg-canvas text-muted"}`}>{code === "zh" ? "中" : code}</span>
                <span className="flex-1"><span lang={code} className="block text-[13px] font-semibold">{LABELS[code]}</span><span className="block text-[10px] font-normal text-faint">{SUBTITLES[code]}</span></span>
                {selected && <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 10 4 4 8-8"/></svg>}
              </button>;
            })}
          </div>
        </>, document.body,
      )}
    </>
  );
}
