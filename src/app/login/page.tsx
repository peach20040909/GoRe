"use client";
// 로그인 플로우: 이메일·비밀번호 입력 → 형식 확인(아니면 오류 안내) → 인증(실패 안내) → 세션 생성 → 홈
// 계정이 없으면 회원가입 → 완료. 비밀번호 찾기는 목업(기능 없음)
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, browserLanguage } from "@/lib/client";
import { setSession, type SessionUser } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AuthRes = { token: string; user: SessionUser };

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "done">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetNote, setResetNote] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // 입력 형식이 맞는가?
    if (!email.trim() || !password) return setError("이메일과 비밀번호를 입력해 주세요");
    if (!EMAIL_RE.test(email.trim())) return setError("이메일 형식이 올바르지 않아요");
    if (mode === "signup" && password.length < 8) return setError("비밀번호는 8자 이상이어야 해요");
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const r = await api<AuthRes>("/api/auth/login", { email, password });
        setSession(r.token, r.user);
        router.replace("/");
      } else {
        const r = await api<AuthRes>("/api/auth/signup", { email, password, nickname: nickname || undefined, language: browserLanguage() });
        setSession(r.token, r.user);
        setMode("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요");
    } finally {
      setBusy(false);
    }
  }

  if (mode === "done")
    return (
      <div className="mx-auto max-w-sm px-6 pt-16 text-center">
        <p className="text-sm font-semibold text-brand">GO AGAIN. RECONNECT.</p>
        <h1 className="mt-2 text-2xl font-extrabold">회원가입이 완료됐어요</h1>
        <p className="mt-2 text-muted">이제 장소에 기억을 맡기고, 다시 와서 꺼내 보세요.</p>
        <button className="btn mt-8 w-full" onClick={() => router.replace("/")}>시작하기</button>
      </div>
    );

  return (
    <div className="relative mx-auto max-w-sm px-6 pb-8 pt-14">
      <Link href="/" replace aria-label="닫고 홈으로" className="absolute right-3 top-2 flex size-11 items-center justify-center rounded-xl text-[28px] leading-none text-muted">
        <span aria-hidden="true">×</span>
      </Link>
      <p className="text-sm font-semibold text-brand">GO AGAIN. RECONNECT.</p>
      <h1 className="mt-1 text-2xl font-extrabold">{mode === "login" ? "로그인" : "회원가입"}</h1>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3" noValidate>
        {mode === "signup" && (
          <label className="flex flex-col gap-1 text-sm">
            닉네임 (선택)
            <input className="card h-12 px-4" value={nickname} onChange={(e) => setNickname(e.target.value)} autoComplete="nickname" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input className="card h-12 px-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input className="card h-12 px-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button className="btn mt-2" disabled={busy}>{busy ? "확인 중…" : mode === "login" ? "로그인" : "가입하기"}</button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-muted">
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }} className="underline">
          {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있어요"}
        </button>
        {mode === "login" && <button onClick={() => setResetNote(true)} className="underline">비밀번호 찾기</button>}
      </div>
      {resetNote && <p className="mt-3 rounded-xl bg-brand-soft p-3 text-sm text-brand">비밀번호 재설정 메일 기능은 준비 중이에요.</p>}
    </div>
  );
}
