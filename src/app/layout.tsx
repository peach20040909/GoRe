import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SERVICE } from "@/lib/prompts";
import { LanguageProvider } from "@/components/LanguageProvider";

export const metadata: Metadata = {
  title: SERVICE.name,
  description: SERVICE.oneLiner,
  openGraph: { title: SERVICE.name, description: SERVICE.oneLiner },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

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
        <LanguageProvider><main className="mx-auto min-h-dvh max-w-[430px] bg-surface">{children}</main></LanguageProvider>
      </body>
    </html>
  );
}
