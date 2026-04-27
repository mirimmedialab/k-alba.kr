/**
 * K-ALBA 디자인 시스템 (McKinsey Editorial Style)
 *
 * 웹 랜딩 페이지(k-alba-mckinsey-landing.html)와 동일한 팔레트·타이포.
 * 기존 coral/mint 팔레트는 legacy로 두고, 점진적으로 대체해 나감.
 *
 * 팔레트 (랜딩 페이지 :root 와 1:1 매핑)
 *   --n9  #0A1628  navy (진한 남색, 배경/텍스트)
 *   --n7  #1B365D  navy light
 *   --g   #B8944A  champagne gold (주요 강조)
 *   --gl  #E8D9B5  gold light
 *   --ac  #C2512A  terracotta accent (오류/경고/중요)
 *   --abg #F5E8E2  accent background
 *   --p2  #F7F5F0  cream (섹션 대체 배경)
 *   --r   #D9D4C7  border (연한 베이지 라인)
 */
export const T = {
  // ────────── 새 McKinsey 팔레트 ──────────
  n9: "#0A1628",        // navy (진한 배경/헤드라인)
  n7: "#1B365D",        // navy light (보조)
  ink: "#0A1628",       // 본문 텍스트
  ink2: "#3F5273",      // 2차 텍스트
  ink3: "#6B7A95",      // 3차 텍스트 (라벨)
  gold: "#B8944A",      // 주요 CTA / 포인트
  goldL: "#E8D9B5",     // 골드 라이트
  accent: "#C2512A",    // 테라코타 (경고/강조)
  accentBg: "#F5E8E2",  // 테라코타 배경
  green: "#2A7A4A",     // 성공 (짙은 그린 — 민트 대체)
  red: "#A83B2B",       // 오류

  // 중립색
  paper: "#FFFFFF",     // 흰색
  cream: "#F7F5F0",     // 크림 (섹션 alt 배경)
  border: "#D9D4C7",    // 연한 베이지 라인

  // ────────── 시맨틱 엘리어스 (기존 코드 호환용) ──────────
  // 기존 coral/mint 색 참조는 새 팔레트로 자동 매핑됨
  coral: "#C2512A",     // ← 기존 #FF6B5A → 테라코타로 대체
  coralL: "#F5E8E2",    // ← 기존 #FFF0EE → 테라코타 배경
  mint: "#B8944A",      // ← 기존 #0BD8A2 → 골드로 대체 (primary CTA)
  mintL: "#FAF5E8",     // ← 기존 #E8FFF7 → 연한 골드
  navy: "#0A1628",      // ← 기존 #1A1F3D → 더 진한 네이비
  navyL: "#1B365D",     // ← 기존 #2D3461

  // 그레이 스케일 (McKinsey 톤에 맞게 재조정)
  g50: "#FBFAF7",
  g100: "#F7F5F0",      // = cream
  g200: "#D9D4C7",      // = border
  g300: "#BDB6A5",
  g500: "#6B7A95",      // = ink3
  g700: "#3F5273",      // = ink2
};

// ────────── 타이포그래피 ──────────
export const TYPE = {
  // 폰트 패밀리 — 랜딩 페이지와 동일
  family: "'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif",

  // 사이즈 스케일 (반응형 clamp)
  hero: "clamp(24px, 5vw, 32px)",      // 메인 타이틀 (모바일)
  display: "clamp(20px, 4vw, 28px)",   // 섹션 타이틀
  h1: 22,
  h2: 18,
  h3: 16,
  body: 15,
  bodyS: 14,
  caption: 12,
  micro: 11,

  // 웨이트
  black: 900,
  bold: 800,
  semi: 700,
  medium: 600,
  regular: 400,

  // 자간 (McKinsey는 타이틀에 tight letter-spacing 사용)
  tightest: "-0.03em",
  tighter: "-0.025em",
  tight: "-0.02em",
  normal: "-0.01em",
};

// ────────── 레이아웃 토큰 ──────────
export const L = {
  // border-radius — 직각 베이스 (기존 14px → 4~6px로 샤프하게)
  rNone: 0,
  rSm: 4,       // 버튼, 라벨
  rMd: 6,       // 카드, 입력
  rLg: 8,       // 대형 카드
  rPill: 100,   // 태그

  // 간격
  gap: 16,
  gapLg: 24,
  gapXl: 32,

  // 경계선
  border: `1px solid ${T.border}`,
  borderStrong: `2px solid ${T.n9}`,

  // 최대 폭
  container: 1200,
  narrow: 820,
  form: 600,
};

// ────────── 공통 스타일 헬퍼 ──────────
export const S = {
  // 버튼 primary (골드)
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 24px",
    textDecoration: "none",
    borderRadius: 4,
    border: "1px solid transparent",
    background: T.gold,
    color: T.n9,
    cursor: "pointer",
    fontFamily: TYPE.family,
    transition: "all 0.15s",
  },

  // 버튼 secondary (외곽선)
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
    padding: "12px 22px",
    textDecoration: "none",
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    background: T.paper,
    color: T.ink,
    cursor: "pointer",
    fontFamily: TYPE.family,
    transition: "all 0.15s",
  },

  // 버튼 dark (네이비)
  btnDark: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    fontSize: 15,
    padding: "13px 24px",
    textDecoration: "none",
    borderRadius: 4,
    border: "1px solid transparent",
    background: T.n9,
    color: T.paper,
    cursor: "pointer",
    fontFamily: TYPE.family,
  },

  // 카드 기본
  card: {
    background: T.paper,
    border: L.border,
    borderRadius: L.rMd,
    padding: 20,
  },

  // 섹션 (흰 배경)
  section: {
    padding: "48px 20px",
    borderBottom: L.border,
  },

  // 섹션 (크림 배경)
  sectionAlt: {
    padding: "48px 20px",
    background: T.cream,
    borderBottom: L.border,
  },

  // 입력
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: L.rSm,
    border: `1px solid ${T.border}`,
    fontSize: 15,
    fontFamily: TYPE.family,
    outline: "none",
    color: T.ink,
    background: T.paper,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },

  // 라벨
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: T.ink,
    marginBottom: 6,
    letterSpacing: "-0.01em",
  },

  // 에디토리얼 스타일 넘버 (McKinsey 특징)
  editorialNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: T.n9,
    color: T.gold,
    fontWeight: 800,
    fontSize: 15,
    borderRadius: 4,
    letterSpacing: 0,
  },

  // 큰 수치 강조 (hero-stat-num 스타일)
  bigStat: {
    fontSize: 32,
    fontWeight: 800,
    color: T.accent,
    letterSpacing: TYPE.tighter,
    lineHeight: 1,
  },

  // 타이틀
  slideTitle: {
    fontWeight: 800,
    fontSize: TYPE.display,
    lineHeight: 1.3,
    letterSpacing: TYPE.tighter,
    color: T.ink,
    marginBottom: 32,
  },
};
