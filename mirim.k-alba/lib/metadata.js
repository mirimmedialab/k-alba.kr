/**
 * Next.js App Router 루트 metadata 설정
 *
 * 적용: src/app/layout.jsx (또는 .tsx) 파일의 metadata export에 추가
 *
 * 기존 layout.jsx를 덮어쓰지 않고, metadata 객체만 병합하세요.
 *
 * 사용 예:
 *   export const metadata = {
 *     ...ROOT_METADATA,
 *     // 페이지별 추가 설정
 *   };
 */

export const ROOT_METADATA = {
  metadataBase: new URL("https://k-alba.kr"),
  title: {
    default: "K-ALBA | 한국 외국인을 위한 알바 플랫폼",
    template: "%s | K-ALBA",
  },
  description:
    "한국에 거주하는 외국인 260만 명을 위한 비자별 맞춤 알바 매칭 서비스. " +
    "카카오톡 챗봇 기반 3분 근로계약, 7개 언어 지원, 위치 기반 공고 추천.",
  keywords: [
    "외국인 알바",
    "foreign jobs korea",
    "비자 알바",
    "E-9 알바",
    "D-2 알바",
    "유학생 알바",
    "한국 외국인",
    "외국인 근로계약서",
    "K-ALBA",
  ],
  authors: [{ name: "미림미디어랩 주식회사", url: "https://k-alba.kr" }],
  creator: "미림미디어랩 주식회사",
  publisher: "미림미디어랩 주식회사",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US", "zh_CN", "vi_VN", "ja_JP"],
    url: "https://k-alba.kr",
    siteName: "K-ALBA",
    title: "K-ALBA | 한국 외국인을 위한 알바 플랫폼",
    description:
      "한국에 거주하는 외국인을 위한 비자별 맞춤 알바 서비스. 7개 언어 · 3분 계약서.",
    images: [
      {
        url: "/og-image.png", // 1200x630 권장. 추후 디자인 필요
        width: 1200,
        height: 630,
        alt: "K-ALBA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-ALBA | 한국 외국인을 위한 알바 플랫폼",
    description:
      "260만 외국인을 위한 비자별 맞춤 알바 · 7개 언어 · 3분 계약서",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://k-alba.kr",
    languages: {
      "ko-KR": "https://k-alba.kr",
      "en-US": "https://k-alba.kr?lang=en",
      "zh-CN": "https://k-alba.kr?lang=zh",
      "vi-VN": "https://k-alba.kr?lang=vi",
      "ja-JP": "https://k-alba.kr?lang=ja",
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  verification: {
    // Google Search Console, Naver Webmaster 등 등록 후 추가
    // google: "google-site-verification-code",
    // other: { "naver-site-verification": "naver-code" },
  },
};

/**
 * 페이지별 metadata 오버라이드 예시
 */
export const ABOUT_METADATA = {
  title: "서비스 소개",
  description:
    "K-ALBA는 한국의 260만 외국인 주민을 위한 합법적이고 투명한 알바 플랫폼입니다. " +
    "비자 필터링, 7개 언어 지원, 카카오톡 기반 3분 근로계약.",
  openGraph: {
    title: "K-ALBA 서비스 소개",
    description: "외국인을 위한 비자별 맞춤 알바 · 7개 언어 · 3분 계약서",
  },
};

export const JOBS_METADATA = {
  title: "알바 찾기",
  description: "내 비자에 맞는 한국 알바 공고를 거리순·급여순으로 탐색하세요.",
};

export const SIGNUP_METADATA = {
  title: "회원가입",
  description: "무료로 가입하고 비자에 맞는 알바를 바로 찾아보세요.",
};
