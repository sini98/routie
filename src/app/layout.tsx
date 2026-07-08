import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import RegionSetup from "@/components/RegionSetup";
import NaverMapsPreloader from "@/components/NaverMapsPreloader";

export const metadata: Metadata = {
  title: "Routie - 하루 일정을 더 쉽게",
  description: "여러 장소를 방문하는 하루 외출 일정을 지도와 함께 관리하는 서비스, Routie",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#4F7FFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {/* 네이버 지도 SDK 스크립트 요청의 DNS/TLS 협상을 앱 진입 시점에 미리 끝내둡니다.
            React가 이 <link>를 자동으로 <head>로 끌어올립니다(App Router 지원 기능). */}
        <link rel="preconnect" href="https://oapi.map.naver.com" />
        {children}
        <PwaRegister />
        <RegionSetup />
        {/* 지도 화면에 들어가기 전부터 SDK 스크립트를 미리 받아두는 조용한 프리로더입니다. */}
        <NaverMapsPreloader />
      </body>
    </html>
  );
}
