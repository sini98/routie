import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import RegionSetup from "@/components/RegionSetup";

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
        {children}
        <PwaRegister />
        <RegionSetup />
      </body>
    </html>
  );
}
