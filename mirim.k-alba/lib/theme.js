/**
 * K-ALBA 디자인 시스템 (Design Tokens)
 *
 * BI v2 (2026-05-06) 디자인 결정 문서를 코드로 박은 단일 출처(SSOT).
 * 모든 페이지/컴포넌트는 이 파일에서 색상·타이포·간격을 가져온다.
 *
 * ════════════════════════════════════════════════════════════════════
 * BI v2 핵심 결정 요약
 * ════════════════════════════════════════════════════════════════════
 *
 * 1. 두 랜딩의 톤 분리 유지
 *    - 데스크톱 랜딩 `/` : 네이비(#0A1628) + 골드(#B8944A) — McKinsey 풍
 *    - 모바일 랜딩 `/m` : 코랄(#FF6B5A) + 민트(#0BD8A2) — 친근 풍
 *
 * 2. 인앱은 코랄/민트로 통일 (사장님 페이지에 골드 액센트 보강)
 *
 * 3. 챗봇 알비는 카카오 노랑(#FEE500) + 네이비 K
 *
 * 4. 비자별 컬러 시스템 (D-2/D-4/E-9/F-2/F-4/F-5/H-2)
 *
 * ════════════════════════════════════════════════════════════════════
 * 사용 가이드
 * ════════════════════════════════════════════════════════════════════
 *
 * import { T, TYPE, L, S, VISA, SEMANTIC } from '@/lib/theme';
 *
 * <div style={{ color: T.coral, background: T.cream }}>
 *   <span style={{ ...TYPE.h1Style }}>제목</span>
 * </div>
 *
 * <Badge color={VISA.E9}>E-9</Badge>
 * <Toast color={SEMANTIC.success}>완료</Toast>
 */


// ════════════════════════════════════════════════════════════════════
// 컬러 팔레트 (마스터)
// ════════════════════════════════════════════════════════════════════

export const T = {
  // ────────── Primary 4종 (BI v2 Section 0.4) ──────────
  coral: "#FF6B5A",       // 주요 CTA, 강조, K 글자
  coralDark: "#E85A4D",   // 사장님 페이지 차분한 코랄
  coralL: "#FFE8E4",      // 코랄 라이트 배경 (배지 등)
  mint: "#0BD8A2",        // 성공, 진행, 긍정, D-2 비자
  mintL: "#E0F8EF",       // 민트 라이트 배경
  navy: "#0A1628",        // 본문, 헤딩, 다크 배경
  navyL: "#1B365D",       // 네이비 라이트
  gold: "#B8944A",        // 신뢰 액센트, 사장님 페이지, F-2 비자
  goldL: "#E8D9B5",       // 골드 라이트

  // ────────── Neutral (배경 / 텍스트) ──────────
  paper: "#FFFFFF",       // 카드, 모달 배경
  cream: "#FAF8F3",       // 페이지 배경 (메인) — BI v2
  surfaceAlt: "#F7F5F0",  // 보조 카드 배경
  border: "#E8E4DB",      // 보더, 구분선
  borderStrong: "#D4D0CA", // 강한 보더 (인풋 등)

  ink: "#0A1628",         // 본문 텍스트 (= navy)
  ink2: "#3F5273",        // 2차 텍스트
  ink3: "#6B7A95",        // 3차 텍스트 (라벨, 캡션)

  // ────────── Semantic (의미 컬러) ──────────
  // SEMANTIC 객체로도 노출되지만, T.success 등으로도 접근 가능
  success: "#0BD8A2",     // 합격, 승인, 완료 (= mint 재사용)
  successBg: "#E0F8EF",
  warning: "#F59E0B",     // 검토 중, 주의, 기한 임박 (= H-2 비자)
  warningBg: "#FEF3C7",
  error: "#DC2626",       // 거절, 오류
  errorBg: "#FEE2E2",
  info: "#1E40AF",        // 안내, 알림
  infoBg: "#DBEAFE",

  // ────────── Brand Accent (BI v2 보강) ──────────
  accent: "#C2512A",      // 테라코타 (랜딩 페이지에서 사용)
  accentBg: "#F5E8E2",

  // ────────── Kakao 컬러 ──────────
  kakaoYellow: "#FEE500",       // 챗봇 아바타 배경
  kakaoYellowMsg: "#FFEB33",    // 챗봇 사용자 메시지 배경
  kakaoChatBg: "#B2C7D9",       // 카톡 채팅창 배경
  kakaoHeader: "#A1B7CB",       // 카톡 헤더 배경

  // ────────── Grayscale (8단계) ──────────
  g50: "#FBFAF7",
  g100: "#F7F5F0",        // = surfaceAlt
  g200: "#E8E4DB",        // = border
  g300: "#D4D0CA",        // = borderStrong
  g500: "#6B7A95",        // = ink3
  g700: "#3F5273",        // = ink2
  g900: "#0A1628",        // = navy

  // ────────── Legacy 호환 키 (기존 코드 깨지지 않게 유지) ──────────
  // 기존에 사용하던 키들. 점진적으로 위 새 키로 마이그레이션 권장.
  n9: "#0A1628",          // = navy (랜딩 페이지에서 자주 사용)
  n7: "#1B365D",          // = navyL
  green: "#0BD8A2",       // = mint (T.green으로 쓰는 곳 호환)
  red: "#DC2626",         // = error
  abg: "#F5E8E2",         // = accentBg

  // ────────── 다국어 액센트 (선택적) ──────────
  // 언어별 미세 액센트가 필요할 때
  ko: "#FF6B5A",          // 한국어 = 코랄
  vi: "#DA251D",          // 베트남어 = 빨강 (베트남 국기)
  zh: "#DE2910",          // 중국어 = 빨강 (중국 국기)
  mn: "#C4272F",          // 몽골어 = 빨강 (몽골 국기)
  uz: "#1EB53A",          // 우즈벡어 = 녹색 (우즈벡 국기)
  ja: "#BC002D",          // 일본어 = 빨강 (일본 국기)
  en: "#1E40AF",          // 영어 = 파랑
};


// ════════════════════════════════════════════════════════════════════
// 비자 컬러 시스템 (BI v2 Section 0.4)
// ════════════════════════════════════════════════════════════════════
//
// K-ALBA 특화 — 비자 유형을 한눈에 구분하는 색상 시스템.
// 외국인이 한국어를 모르고도 "내 비자로 일할 수 있는 자리"를
// 5초 안에 인식하게 하는 것이 목적.

export const VISA = {
  D2: { code: "D-2", label: "유학",        color: "#0BD8A2", textOn: "#04342C", bg: "#E0F8EF" },
  D4: { code: "D-4", label: "어학연수",    color: "#4ECDC4", textOn: "#04342C", bg: "#E1F5F4" },
  E9: { code: "E-9", label: "비전문취업",  color: "#FF6B5A", textOn: "#FFFFFF", bg: "#FFE8E4" },
  F2: { code: "F-2", label: "거주",        color: "#B8944A", textOn: "#FFFFFF", bg: "#FAF1DC" },
  F4: { code: "F-4", label: "재외동포",    color: "#9333EA", textOn: "#FFFFFF", bg: "#F3E8FF" },
  F5: { code: "F-5", label: "영주",        color: "#0A1628", textOn: "#FFFFFF", bg: "#E5E7EB" },
  H2: { code: "H-2", label: "방문취업",    color: "#F59E0B", textOn: "#412402", bg: "#FEF3C7" },
};


// ════════════════════════════════════════════════════════════════════
// Semantic 컬러 (이미 T 안에도 있지만, 명시적 import 가능)
// ════════════════════════════════════════════════════════════════════

export const SEMANTIC = {
  success: { color: "#0BD8A2", bg: "#E0F8EF", text: "#04342C" },  // 합격, 승인
  warning: { color: "#F59E0B", bg: "#FEF3C7", text: "#412402" },  // 검토중, 기한
  error:   { color: "#DC2626", bg: "#FEE2E2", text: "#7F1D1D" },  // 거절, 오류
  info:    { color: "#1E40AF", bg: "#DBEAFE", text: "#1E3A8A" },  // 알림, 안내
};


// ════════════════════════════════════════════════════════════════════
// 타이포그래피 (BI v2 Section 0.5)
// ════════════════════════════════════════════════════════════════════

export const TYPE = {
  // ────────── 폰트 패밀리 (다국어 통합) ──────────
  family: `"Pretendard Variable", Pretendard,
           -apple-system, BlinkMacSystemFont,
           "Apple SD Gothic Neo",
           "Noto Sans KR",
           "Noto Sans Vietnamese",
           "Noto Sans SC",
           "Noto Sans Mongolian",
           sans-serif`,

  // 숫자 전용 — 디자인적 강조 시 사용 (Pretendard와 동일 패밀리지만 명시)
  familyNumber: `"Pretendard Variable", Pretendard, sans-serif`,

  // 모노 폰트 (코드, 사업자번호, 비자 코드 등)
  familyMono: `"JetBrains Mono", "Consolas", "Monaco", monospace`,

  // ────────── 가중치 5단계 ──────────
  black: 900,
  extrabold: 800,    // 워드마크, H1, 강조 숫자
  bold: 700,         // H2~H4, 버튼, 태그, 알림 제목
  semibold: 600,     // H3, 작은 강조
  medium: 500,       // 본문 강조, 라벨
  regular: 400,      // 본문

  // 기존 호환
  semi: 700,

  // ────────── 사이즈 스케일 9단계 (BI v2) ──────────
  display: 48,       // Display — 랜딩 메인 카피
  h1: 36,            // H1 — 페이지 제목
  h2: 24,            // H2 — 섹션 제목
  h3: 18,            // H3 — 카드 제목
  h4: 16,            // H4 — 작은 제목
  body: 15,          // Body — 본문
  bodyS: 13,         // Body Sm — 작은 본문
  caption: 11,       // Caption — 캡션, 라벨
  number: 28,        // Number — 시급, 인원수 강조

  // ────────── 자간 ──────────
  tightest: "-0.04em",   // 워드마크, Display
  tighter: "-0.03em",    // H1
  tight: "-0.02em",      // H2, Number
  snug: "-0.01em",       // H3
  normal: "0",           // 본문
  wide: "0.05em",        // Caption (대문자 영문 등)

  // ────────── 줄높이 ──────────
  leadingTight: 1.1,     // Display
  leadingSnug: 1.2,      // H1
  leadingNormal: 1.3,    // H2
  leadingRelaxed: 1.5,   // H4
  leadingLoose: 1.7,     // Body (다국어 친화)

  // ────────── 사용 편의 — 통합 스타일 객체 ──────────
  // 별도로 객체를 만들어두면 한 줄로 적용 가능
  displayStyle: {
    fontSize: 48,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1.1,
  },
  h1Style: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  h2Style: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
  },
  h3Style: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.4,
  },
  h4Style: {
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  bodyStyle: {
    fontSize: 15,
    fontWeight: 400,
    lineHeight: 1.7,
  },
  bodySStyle: {
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.6,
  },
  captionStyle: {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.05em",
    lineHeight: 1.5,
  },
  numberStyle: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    lineHeight: 1.0,
  },

  // ────────── 미디어 쿼리 (반응형 사이즈) ──────────
  // 기존 호환용
  hero: "clamp(28px, 5vw, 48px)",
};


// ════════════════════════════════════════════════════════════════════
// 레이아웃 토큰 (스페이싱, 라운드, 그림자)
// ════════════════════════════════════════════════════════════════════

export const L = {
  // ────────── Border Radius ──────────
  rNone: 0,
  rSm: 4,        // 작은 배지, 라벨
  rMd: 6,        // 입력, 작은 카드
  rLg: 8,        // 카드 (메인)
  rXl: 12,       // 큰 카드, 모달
  r2Xl: 16,      // 모바일 바텀시트
  rPill: 100,   // 태그, 빠른답장 버튼

  // ────────── 8px 그리드 스페이싱 ──────────
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
  s48: 48,
  s64: 64,

  // ────────── Border ──────────
  border: "1px solid #E8E4DB",
  borderStrong: "1px solid #D4D0CA",
  borderNavy: "2px solid #0A1628",
  borderCoral: "2px solid #FF6B5A",
  borderGold: "1px solid #B8944A",  // 사장님 페이지 액센트

  // ────────── 그림자 (절제된 사용) ──────────
  shadowSm: "0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 2px 8px rgba(0,0,0,0.06)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.10)",
  shadowXl: "0 20px 60px rgba(0,0,0,0.20)",   // 모달

  // ────────── 최대 폭 ──────────
  container: 1200,    // 데스크톱 컨테이너
  narrow: 820,        // 좁은 본문
  form: 600,          // 폼
  mobile: 480,        // 모바일 wrapper (DesktopMobileFrame)

  // ────────── Z-index ──────────
  zNav: 50,
  zModal: 100,
  zToast: 200,
  zChatbot: 300,
};


// ════════════════════════════════════════════════════════════════════
// 공통 스타일 헬퍼 (자주 쓰는 조합)
// ════════════════════════════════════════════════════════════════════

export const S = {
  // ────────── Button ──────────
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 14,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: T.coral,
    color: T.paper,
    cursor: "pointer",
    fontFamily: TYPE.family,
    transition: "all 0.15s",
    textDecoration: "none",
  },

  // 사장님 페이지 버튼 (차분한 코랄)
  btnPrimaryDark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 14,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: T.coralDark,
    color: T.paper,
    cursor: "pointer",
    fontFamily: TYPE.family,
    transition: "all 0.15s",
  },

  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 14,
    padding: "11px 20px",
    borderRadius: 10,
    border: `1.5px solid ${T.navy}`,
    background: T.paper,
    color: T.navy,
    cursor: "pointer",
    fontFamily: TYPE.family,
    transition: "all 0.15s",
  },

  btnGhost: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontWeight: 700,
    fontSize: 14,
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: T.coral,
    cursor: "pointer",
    fontFamily: TYPE.family,
  },

  btnDestructive: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    fontSize: 14,
    padding: "12px 20px",
    borderRadius: 10,
    border: "none",
    background: T.error,
    color: T.paper,
    cursor: "pointer",
    fontFamily: TYPE.family,
  },

  // ────────── 데스크톱 랜딩 전용 (네이비/골드) ──────────
  btnLandingPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 24px",
    borderRadius: 4,
    border: "1px solid transparent",
    background: T.gold,
    color: T.navy,
    cursor: "pointer",
    fontFamily: TYPE.family,
    textDecoration: "none",
  },

  btnLandingDark: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 24px",
    borderRadius: 4,
    border: "1px solid transparent",
    background: T.navy,
    color: T.paper,
    cursor: "pointer",
    fontFamily: TYPE.family,
  },

  // ────────── Card ──────────
  card: {
    background: T.paper,
    border: L.border,
    borderRadius: L.rLg,
    padding: 20,
  },

  cardEmployer: {
    background: T.paper,
    border: L.border,
    borderRadius: L.rLg,
    padding: 20,
    borderTop: `2px solid ${T.gold}`,  // 사장님 페이지 골드 액센트
  },

  // ────────── Section ──────────
  section: {
    padding: "48px 20px",
    borderBottom: L.border,
  },

  sectionAlt: {
    padding: "48px 20px",
    background: T.cream,
    borderBottom: L.border,
  },

  // ────────── Input ──────────
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: L.rMd,
    border: `1px solid ${T.borderStrong}`,
    fontSize: 15,
    fontFamily: TYPE.family,
    outline: "none",
    color: T.ink,
    background: T.paper,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },

  inputError: {
    borderColor: T.error,
    background: T.errorBg,
  },

  // ────────── Label ──────────
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: T.ink,
    marginBottom: 6,
    letterSpacing: "-0.01em",
  },

  // ────────── Badge / Tag ──────────
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    background: T.coral,
    color: T.paper,
  },

  badgeNeutral: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 500,
    padding: "3px 8px",
    borderRadius: 6,
    background: T.cream,
    color: T.ink3,
  },

  // ────────── Editorial Number (랜딩 페이지) ──────────
  editorialNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: T.navy,
    color: T.gold,
    fontWeight: 800,
    fontSize: 15,
    borderRadius: 4,
  },

  // ────────── Big Stat (시급 등 강조 숫자) ──────────
  bigStat: {
    fontSize: 28,
    fontWeight: 800,
    color: T.coral,
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },

  // 데스크톱 랜딩용 (테라코타)
  bigStatLanding: {
    fontSize: 32,
    fontWeight: 800,
    color: T.accent,
    letterSpacing: "-0.03em",
    lineHeight: 1,
  },

  // ────────── Slide Title ──────────
  slideTitle: {
    fontWeight: 800,
    fontSize: "clamp(20px, 4vw, 28px)",
    lineHeight: 1.3,
    letterSpacing: "-0.03em",
    color: T.ink,
    marginBottom: 32,
  },

  // ────────── K 아이콘 (BI v2 Section 0.2) ──────────
  // 워드마크가 아닌 K 한 글자 아이콘 형태
  kIconStandard: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: T.navy,
    color: T.coral,
    fontWeight: 800,
    fontFamily: TYPE.family,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },

  kIconKakao: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: T.kakaoYellow,
    color: T.navy,
    fontWeight: 800,
    fontFamily: TYPE.family,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },

  kIconCoral: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: T.coral,
    color: T.paper,
    fontWeight: 800,
    fontFamily: TYPE.family,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
};


// ════════════════════════════════════════════════════════════════════
// 아이콘 사이즈 (BI v2 K 아이콘 박스 둥글기 가이드)
// ════════════════════════════════════════════════════════════════════

export const ICON_SIZES = {
  xl: { box: 96, font: 48, radius: 22 },     // 앱 아이콘 대형
  lg: { box: 64, font: 32, radius: 14 },     // 앱 아이콘 중형
  md: { box: 48, font: 24, radius: 11 },     // 일반 아바타
  sm: { box: 36, font: 18, radius: 10 },     // 챗봇 메시지 아바타
  xs: { box: 24, font: 12, radius: 6 },      // SMS prefix
  xxs: { box: 20, font: 11, radius: 5 },     // 인라인
  fav: { box: 16, font: 10, radius: 3 },     // 파비콘
};


// ════════════════════════════════════════════════════════════════════
// 슬로건 (BI v2 Section 0.7)
// ════════════════════════════════════════════════════════════════════

export const SLOGAN = {
  ko: "외국인과 사장님을 잇는 카톡 알바 플랫폼",
  en: "Connect Foreign Workers and Korean Bosses on KakaoTalk",
  vi: "Nền tảng việc làm bán thời gian qua KakaoTalk",
  zh: "通过KakaoTalk连接外国求职者和韩国老板",
  mn: "Гадаад ажилчид болон Солонгос ажил олгогчдыг KakaoTalk-аар холбох",
  uz: "Chet ellik ishchilar va Koreyalik xo'jayinlarni KakaoTalk orqali bog'lash",
  ja: "外国人と社長をカカオトークでつなぐアルバイトプラットフォーム",
};


// ════════════════════════════════════════════════════════════════════
// 회사 정보 (footer, contracts, PDFs 등에서 import)
// ════════════════════════════════════════════════════════════════════

export const COMPANY = {
  name: "미림미디어랩 주식회사",
  ceo: "남기환",
  businessNumber: "119-86-61402",
  jobInfoLicense: "J1204020260002",
  address: "서울특별시 강서구 양천로 583 우림블루나인비즈니스센터 A동 406호",
  email: "contact@k-alba.kr",
  domain: "k-alba.kr",
  brandName: "K-ALBA",
  chatbotName: "알비",
  kakaoChannel: "_qTxouX",
  kakaoChannelUrl: "https://pf.kakao.com/_qTxouX",
};
