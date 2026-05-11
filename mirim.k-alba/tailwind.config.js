/** @type {import('tailwindcss').Config} */
/**
 * K-ALBA Tailwind 설정 (BI v2)
 *
 * lib/theme.js의 토큰을 Tailwind 클래스로 매핑해 사용 가능하게 함.
 * 두 시스템 (theme.js의 T.coral / Tailwind의 bg-coral) 이 항상 동일한 값을 가리킴.
 *
 * ════════════════════════════════════════════════════════════════════
 * 사용 가이드
 * ════════════════════════════════════════════════════════════════════
 *
 * 컬러:
 *   <div className="bg-coral text-paper">  → 코랄 배경 + 흰 텍스트
 *   <div className="bg-cream text-ink">    → 크림 배경 + 본문
 *   <span className="text-ink-3">          → ink3 (라벨)
 *   <Badge className="bg-visa-e9">         → E-9 비자 배경
 *
 * 폰트:
 *   <h1 className="font-pretendard">       → Pretendard Variable + 폴백
 *   <p className="font-mono">              → JetBrains Mono
 *
 * 사이즈:
 *   <h1 className="text-h1">               → 36px (BI 9단계)
 *   <p className="text-body">              → 15px
 *
 * 자간:
 *   <h1 className="tracking-tighter-bi">   → -0.03em (BI 자간)
 *
 * ════════════════════════════════════════════════════════════════════
 *
 * 기존 코드 호환:
 *   기존에 쓰던 클래스 (bg-n9, bg-g, bg-ac 등) 도 그대로 유지.
 *   새로 만드는 컴포넌트만 새 클래스 (bg-coral, bg-navy 등) 사용 권장.
 */

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ────────── BI v2 Primary 4종 ──────────
        coral: {
          DEFAULT: "#FF6B5A",
          dark: "#E85A4D",
          light: "#FFE8E4",
        },
        mint: {
          DEFAULT: "#0BD8A2",
          light: "#E0F8EF",
        },
        navy: {
          DEFAULT: "#0A1628",
          light: "#1B365D",
        },
        gold: {
          DEFAULT: "#B8944A",
          light: "#E8D9B5",
        },

        // ────────── Neutral ──────────
        paper: "#FFFFFF",
        cream: "#FAF8F3",
        "surface-alt": "#F7F5F0",
        border: "#E8E4DB",
        "border-strong": "#D4D0CA",

        ink: {
          DEFAULT: "#0A1628",  // 본문
          2: "#3F5273",        // 2차
          3: "#6B7A95",        // 3차/라벨
        },

        // ────────── Semantic ──────────
        success: {
          DEFAULT: "#0BD8A2",
          bg: "#E0F8EF",
          text: "#04342C",
        },
        warning: {
          DEFAULT: "#F59E0B",
          bg: "#FEF3C7",
          text: "#412402",
        },
        error: {
          DEFAULT: "#DC2626",
          bg: "#FEE2E2",
          text: "#7F1D1D",
        },
        info: {
          DEFAULT: "#1E40AF",
          bg: "#DBEAFE",
          text: "#1E3A8A",
        },

        // ────────── Brand Accent (랜딩 페이지) ──────────
        accent: {
          DEFAULT: "#C2512A",
          bg: "#F5E8E2",
        },

        // ────────── Kakao ──────────
        kakao: {
          yellow: "#FEE500",
          "yellow-msg": "#FFEB33",
          "chat-bg": "#B2C7D9",
          header: "#A1B7CB",
        },

        // ────────── Visa System (BI v2 특화) ──────────
        visa: {
          d2: "#0BD8A2",   // 유학 - 민트
          d4: "#4ECDC4",   // 어학연수 - 청록
          e9: "#FF6B5A",   // 비전문취업 - 코랄
          f2: "#B8944A",   // 거주 - 골드
          f4: "#9333EA",   // 재외동포 - 보라
          f5: "#0A1628",   // 영주 - 네이비
          h2: "#F59E0B",   // 방문취업 - 주황
        },

        // ────────── Grayscale ──────────
        gray: {
          50: "#FBFAF7",
          100: "#F7F5F0",
          200: "#E8E4DB",
          300: "#D4D0CA",
          500: "#6B7A95",
          700: "#3F5273",
          900: "#0A1628",
        },

        // ────────── Legacy 호환 (기존 코드 깨지지 않게 유지) ──────────
        n9: "#0A1628",       // = navy
        n7: "#1B365D",       // = navy.light
        p: "#FFFFFF",        // = paper
        p2: "#F7F5F0",       // = surface-alt
        r: "#D9D4C7",        // 기존 border 값 (그대로 유지)
        g: "#B8944A",        // = gold (legacy 키)
        gl: "#E8D9B5",       // = gold.light
        ac: "#C2512A",       // = accent (legacy)
      },

      // ────────── 폰트 패밀리 (다국어 통합) ──────────
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Noto Sans Vietnamese",
          "Noto Sans SC",
          "Noto Sans Mongolian",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        pretendard: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Consolas",
          "Monaco",
          "monospace",
        ],
      },

      // ────────── 폰트 사이즈 (BI v2 9단계) ──────────
      fontSize: {
        // [size, { lineHeight, letterSpacing }]
        display: ["48px", { lineHeight: "1.1", letterSpacing: "-0.04em" }],
        h1: ["36px", { lineHeight: "1.2", letterSpacing: "-0.03em" }],
        h2: ["24px", { lineHeight: "1.3", letterSpacing: "-0.02em" }],
        h3: ["18px", { lineHeight: "1.4", letterSpacing: "-0.01em" }],
        h4: ["16px", { lineHeight: "1.5" }],
        body: ["15px", { lineHeight: "1.7" }],
        "body-sm": ["13px", { lineHeight: "1.6" }],
        caption: ["11px", { lineHeight: "1.5", letterSpacing: "0.05em" }],
        number: ["28px", { lineHeight: "1.0", letterSpacing: "-0.02em" }],
      },

      // ────────── 가중치 (BI v2 5단계) ──────────
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },

      // ────────── 자간 (BI v2) ──────────
      letterSpacing: {
        "tightest-bi": "-0.04em",   // 워드마크
        "tighter-bi": "-0.03em",    // H1, Display
        "tight-bi": "-0.02em",      // H2, Number
        "snug-bi": "-0.01em",       // H3
        "wide-bi": "0.05em",        // Caption
      },

      // ────────── 줄 높이 ──────────
      lineHeight: {
        "tight-bi": "1.1",
        "snug-bi": "1.2",
        "normal-bi": "1.3",
        "relaxed-bi": "1.5",
        "loose-bi": "1.7",          // 다국어 친화 (기본)
      },

      // ────────── Border Radius ──────────
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        pill: "100px",
      },

      // ────────── 8px 그리드 스페이싱 ──────────
      // Tailwind 기본 spacing은 4px 기준, K-ALBA는 8px 그리드 강조
      spacing: {
        "s4": "4px",
        "s8": "8px",
        "s12": "12px",
        "s16": "16px",
        "s20": "20px",
        "s24": "24px",
        "s32": "32px",
        "s40": "40px",
        "s48": "48px",
        "s64": "64px",
      },

      // ────────── 그림자 ──────────
      boxShadow: {
        "k-sm": "0 1px 2px rgba(0,0,0,0.04)",
        "k-md": "0 2px 8px rgba(0,0,0,0.06)",
        "k-lg": "0 8px 24px rgba(0,0,0,0.10)",
        "k-xl": "0 20px 60px rgba(0,0,0,0.20)",
      },

      // ────────── 최대 폭 ──────────
      maxWidth: {
        "k-container": "1200px",
        "k-narrow": "820px",
        "k-form": "600px",
        "k-mobile": "480px",
      },

      // ────────── Z-index ──────────
      zIndex: {
        nav: "50",
        modal: "100",
        toast: "200",
        chatbot: "300",
      },
    },
  },
  plugins: [],
};
