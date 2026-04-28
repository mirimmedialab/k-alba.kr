import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata = {
  title: "K-ALBA · 외국인 알바 매칭 + 시간제취업 신청",
  description: "한국에 거주하는 260만 외국인을 위한 통합 디지털 인프라. 알바 매칭, 표준근로계약서, 시간제취업 신청, 출입국 통합신청서 자동 작성.",
  keywords: ["외국인 알바", "유학생 알바", "시간제취업", "외국인 일자리", "K-ALBA"],
  authors: [{ name: "미림미디어랩(주)" }],
  creator: "미림미디어랩(주)",
  publisher: "미림미디어랩(주)",
  metadataBase: new URL("https://k-alba.kr"),
  openGraph: {
    title: "K-ALBA · 외국인을 위한 통합 알바 플랫폼",
    description: "비자 자격에 맞는 알바 매칭 + 시간제취업 자동 신청. 한국어, 영어, 중국어 등 7개 언어 지원.",
    url: "https://k-alba.kr",
    siteName: "K-ALBA",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "K-ALBA · 외국인을 위한 통합 알바 플랫폼",
    description: "비자별 알바 매칭 + 시간제취업 자동 신청",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0A1628",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트는 globals.css에서 import */}
      </head>
      <body className="font-sans antialiased bg-p text-ink">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
