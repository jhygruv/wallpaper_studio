import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Wallpaper Meta Studio",
  description: "촬영 날짜/장소를 자동 삽입해 월페이퍼를 만드는 서비스"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
