import "./globals.css";
import AppFrame from "@/components/AppFrame";
import NativeBridge from "@/components/NativeBridge";
import AppSplash from "@/components/AppSplash";
import VisaChatWidget from "@/components/VisaChatWidget";
import AttributionTracker from "@/components/AttributionTracker";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: {
    default: "케이알바(K-ALBA) | 외국인·유학생 알바 매칭 플랫폼",
    template: "%s | 케이알바 K-ALBA",
  },
  description: "케이알바(K-ALBA)는 한국에 거주하는 외국인·유학생을 위한 알바 매칭 플랫폼입니다. 비자 자격에 맞는 합법 알바 매칭, 표준근로계약서, 시간제취업 신청, 출입국 통합신청서 자동 작성을 7개 언어로 지원합니다.",
  keywords: ["케이알바", "K-ALBA", "kalba", "케이알바 외국인알바", "외국인 알바", "유학생 알바", "시간제취업", "외국인 일자리", "외국인 구인구직", "비자 알바", "미림미디어랩"],
  applicationName: "케이알바 K-ALBA",
  authors: [{ name: "미림미디어랩(주)" }],
  creator: "미림미디어랩(주)",
  publisher: "미림미디어랩(주)",
  metadataBase: new URL("https://www.k-alba.kr"),
  alternates: {
    canonical: "https://www.k-alba.kr",
  },
  openGraph: {
    title: "케이알바(K-ALBA) · 외국인을 위한 통합 알바 플랫폼",
    description: "비자 자격에 맞는 알바 매칭 + 시간제취업 자동 신청. 한국어, 영어, 중국어 등 7개 언어 지원.",
    url: "https://www.k-alba.kr",
    siteName: "케이알바 K-ALBA",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/img/og-default.png", width: 1200, height: 630, alt: "K-ALBA · 외국인을 위한 통합 알바 플랫폼" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-ALBA · 외국인을 위한 통합 알바 플랫폼",
    description: "비자별 알바 매칭 + 시간제취업 자동 신청",
    images: ["/img/og-default.png"],
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
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.k-alba.kr/#organization",
      name: "케이알바 K-ALBA",
      alternateName: ["케이알바", "K-ALBA", "kalba"],
      url: "https://www.k-alba.kr",
      logo: "https://www.k-alba.kr/img/og-default.png",
      description: "한국 거주 외국인·유학생을 위한 알바 매칭 플랫폼",
      parentOrganization: { "@type": "Organization", name: "미림미디어랩 주식회사" },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.k-alba.kr/#website",
      url: "https://www.k-alba.kr",
      name: "케이알바 K-ALBA",
      alternateName: ["케이알바", "K-ALBA", "kalba"],
      inLanguage: "ko",
      publisher: { "@id": "https://www.k-alba.kr/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://www.k-alba.kr/jobs?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 폰트는 globals.css에서 import */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans antialiased bg-p text-ink">
        <NativeBridge />
        <AttributionTracker />
        <AppFrame>{children}</AppFrame>
        <AppSplash />
        <VisaChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
