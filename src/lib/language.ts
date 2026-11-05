export const LANGUAGES = ["ko", "en", "ja", "zh"] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_KEY = "gori_language";
export const LOCALES: Record<Language, string> = { ko: "ko-KR", en: "en-US", ja: "ja-JP", zh: "zh-CN" };
let sessionPreference: Language | null = null;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** Manual selection takes priority over the device language. No account or API keys are needed. */
export function preferredLanguage(): Language {
  if (typeof window === "undefined") return "ko";
  if (sessionPreference) return sessionPreference;
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch { /* Language selection still works when storage is unavailable. */ }
  const device = navigator.language.toLowerCase().split("-")[0];
  return isLanguage(device) ? device : "en";
}

export function rememberLanguage(language: Language | null, persist = true) {
  sessionPreference = language;
  if (persist && language) {
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Keep the in-memory choice. */ }
  }
}
