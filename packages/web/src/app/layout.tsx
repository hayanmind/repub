import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { AuthProvider } from "@/lib/auth";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";

export const metadata: Metadata = {
  title: "ePub 리마스터링 | AI 기반 ePub 2.0 → 3.0 자동 변환",
  description:
    "ePub 2.0 전자책을 ePub 3.0 인터랙티브 콘텐츠로 자동 변환합니다. AI 퀴즈 생성, TTS 음성 변환, 접근성 자동 적용(KWCAG 2.1) 지원.",
  keywords: ["ePub", "전자책", "ePub 3.0", "변환", "접근성", "KWCAG", "AI", "TTS", "퀴즈"],
  openGraph: {
    title: "ePub 리마스터링",
    description: "AI 기반 ePub 2.0 → 3.0 인터랙티브 자동 변환 시스템",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ background: 'var(--bg-base)' }}>
        <ClerkProvider localization={koKR}>
          <AuthProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 p-6 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          </AuthProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
