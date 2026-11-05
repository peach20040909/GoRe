import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { SERVICE } from "@/lib/prompts";

export const metadata: Metadata = {
  title: SERVICE.name,
  description: SERVICE.oneLiner,
  openGraph: { title: SERVICE.name, description: SERVICE.oneLiner },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f5bff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="font-bold">{SERVICE.name}</Link>
            <nav className="flex gap-4 text-sm text-muted">
              <Link href="/" className="hover:text-text">홈</Link>
              <Link href="/memories" className="hover:text-text">추억</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-24">{children}</main>
      </body>
    </html>
  );
}
