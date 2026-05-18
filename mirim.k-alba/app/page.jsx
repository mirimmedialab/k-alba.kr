"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { T, COMPANY } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getSession, supabase } from "@/lib/supabase";
import { UserChip } from "@/components/UserChip";
import { Button, KWordmark, PageLoading } from "@/components/ui";
import { KakaoFloatingButton } from "@/components/KakaoFloatingButton";

/**
 * K-ALBA 데스크톱 랜딩 (BI v2 Section 3.2)
 *
 * 톤: 네이비(T.navy) + 골드(T.gold) + 흰색 — McKinsey 풍, 진지·신뢰
 * 페르소나: 사장님(30%) + 학교 담당자(20%) — 50% 첫인상
 *
 * 변경점 (BI v2):
 *   - 로딩: 인라인 → <PageLoading> 컴포넌트
 *   - 6개 인라인 Link 버튼 → <Button variant="landingPrimary"|"landingDark">
 *   - T.g500 (구버전) → T.ink3 (새 표준)
 *   - 이메일: mirimmedialab@gmail.com → COMPANY.email (contact@k-alba.kr)
 *   - 푸터 회사 정보 추가 (사장님 신뢰감 강화)
 *   - 상단 KWordmark 헤더 추가
 *
 * 보존:
 *   - 네이비/골드 팔레트
 *   - 7개 섹션 (HERO/PROBLEM/WORKER/EMPLOYER/PROCESS/CTA/푸터)
 *   - 에디토리얼 톤 (큰 숫자 강조, 미니멀 이모지)
 *   - 샤프한 border-radius 4~6px
 *   - tight letter-spacing
 *   - 비로그인/로그인-사장님/로그인-구직자 3가지 분기
 */
/**
 * Animation variants for scroll reveals - 섹션별 차별화
 */
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// 위에서 아래로 내려오는 효과 (Target Audience Cards)
const fadeInDown = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  }
};

// 좌우로 약간 회전되어 펼쳐지는 효과 (For Workers)
const rotateUnfold = {
  hidden: { opacity: 0, rotateY: -15, x: -20 },
  visible: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
  }
};

// Scale + blur 효과 (Employer)
const scaleBlur = {
  hidden: { opacity: 0, scale: 0.92, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// 기본 stagger 컨테이너
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

// Rotate unfold용 stagger 컨테이너
const rotateUnfoldContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15
    }
  }
};

const rotateUnfoldItem = {
  hidden: { opacity: 0, rotateY: -12, x: -15 },
  visible: {
    opacity: 1,
    rotateY: 0,
    x: 0,
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }
  }
};

// Scale blur용 stagger 컨테이너
const scaleBlurContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2
    }
  }
};

const scaleBlurItem = {
  hidden: { opacity: 0, scale: 0.92, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// Slide from left (University)
const slideFromLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
  }
};

const slideFromLeftContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15
    }
  }
};

const slideFromLeftItem = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

// Target cards용 stagger (위에서 내려오기)
const staggerDownContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const staggerDownItem = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

// 기본 stagger 아이템
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// Scale pulse 아이템 (Problem cards)
const scalePulseItem = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i) => ({
    opacity: 1,
    scale: [0.9, 1.05, 1],
    transition: {
      duration: 0.8,
      delay: i * 0.2,
      times: [0, 0.6, 1],
      ease: [0.34, 1.56, 0.64, 1]
    }
  })
};

// ─────────── Audience Tabs (Workers / Employers / Universities) ───────────
const AUDIENCE_TABS = [
  {
    id: "workers",
    en: "For Workers",
    kr: "외국인 구직자",
    title: "한국어 서류 작성이 어려우신가요?",
    titleAccent: "모국어로 확인하고 작성하세요!",
    items: [
      ["🌐", "내 조건에 꼭 맞는 맞춤형 알바 매칭 서비스"],
      ["📄", "클릭 몇 번으로 손쉽게 작성하는 표준근로계약서"],
      ["📑", "복잡한 시간제취업 신청 서류 원클릭 자동 완성"],
    ],
  },
  {
    id: "employers",
    en: "For Employers",
    kr: "사장님",
    title: "외국인 알바 채용부터 계약까지",
    titleAccent: "복잡한 절차를 한 번에",
    items: [
      ["🤝", "우리 사업장에 꼭 필요한 맞춤형 외국인 알바 매칭"],
      ["📝", "고용 신고의 시작, 필수 표준근로계약서 간편 작성 지원"],
      ["💼", "군더더기 없이 간편한 구인 공고 등록 및 지원자 관리 시스템"],
    ],
  },
  {
    id: "universities",
    en: "For Universities",
    kr: "학교 담당자",
    title: "교내 유학생들의 알바 현황과",
    titleAccent: "필수 서류를 스마트하게",
    items: [
      ["📊", "우리 학교 외국인 유학생들의 알바 매칭 및 취업 현황 관리"],
      ["📑", "유학생 시간제취업 신청서 간편 작성 지원"],
      ["📁", "행정 업무 부담을 획기적으로 줄여주는 효율적인 통합 서류 인프라"],
    ],
  },
];

/** 공용 목업 카드 셸 — 부드러운 그림자 + 보더 + 헤더 도트 */
function MockupShell({ chromeTitle, children }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 14,
        boxShadow: "0 20px 50px -20px rgba(10, 22, 40, 0.18), 0 4px 16px rgba(10, 22, 40, 0.06)",
        overflow: "hidden",
      }}
    >
      {/* Browser-like chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 14px",
          background: "#F3F4F6",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FCA5A5" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#FCD34D" }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#86EFAC" }} />
        <span style={{
          marginLeft: 10,
          fontSize: 11,
          fontWeight: 600,
          color: "#6B7280",
          letterSpacing: "-0.01em",
        }}>
          {chromeTitle}
        </span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

/** Worker 목업 — 다국어 서류 작성 대시보드 */
function WorkerMockup() {
  return (
    <MockupShell chromeTitle="k-alba.kr · 표준근로계약서 작성">
      {/* 언어 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {["🇰🇷 한국어", "🇻🇳 Tiếng Việt", "🇨🇳 中文", "🇺🇿 Oʻzbek"].map((l, i) => (
          <span
            key={l}
            style={{
              padding: "5px 11px",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              background: i === 1 ? "#0A1628" : "#F3F4F6",
              color: i === 1 ? "#FFFFFF" : "#374151",
              letterSpacing: "-0.01em",
            }}
          >
            {l}
          </span>
        ))}
      </div>

      {/* 단계 progress */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
        {[
          ["1", "정보 입력", true],
          ["2", "자동 번역", true],
          ["3", "서명", false],
        ].map(([n, label, done], i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: done ? "#0BD8A2" : "#E5E7EB",
              color: done ? "#FFFFFF" : "#9CA3AF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
            }}>{done ? "✓" : n}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: done ? "#0A1628" : "#9CA3AF" }}>
              {label}
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, background: "#E5E7EB" }} />}
          </div>
        ))}
      </div>

      {/* Form fields (bilingual) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["근로자 성명", "Nguyễn Văn Hòa"],
          ["비자 유형", "D-2 (유학)"],
          ["시급", "₩ 12,000"],
          ["근무 기간", "2026.06.01 ~ 2026.12.31"],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 12px", background: "#F9FAFB", borderRadius: 6,
            border: "1px solid #E5E7EB",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0A1628" }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "#EFF6FF", border: "1px solid #BFDBFE",
        borderRadius: 6, fontSize: 11, color: "#1E40AF", fontWeight: 600,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>🌐</span>
        <span>실시간 베트남어 번역이 적용되었습니다</span>
      </div>
    </MockupShell>
  );
}

/** Employer 목업 — 사장님 관리자 대시보드 */
function EmployerMockup() {
  return (
    <MockupShell chromeTitle="k-alba.kr · 사장님 대시보드">
      {/* Stat row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          ["지원자", "24", "#0A1628"],
          ["진행 공고", "3", "#B8944A"],
          ["체결 계약", "12", "#0BD8A2"],
        ].map(([label, val, color]) => (
          <div key={label} style={{
            padding: "12px 14px", background: "#F9FAFB",
            border: "1px solid #E5E7EB", borderRadius: 8,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em" }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Applicant list */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        최근 지원자
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          ["응웬 반 호아", "D-2 · 유학", "검토 중", "#FEF3C7", "#92400E"],
          ["알리바예바 마디나", "E-9 · 비전문취업", "면접 대기", "#DBEAFE", "#1E40AF"],
          ["첸 웨이밍", "F-4 · 재외동포", "합격", "#D1FAE5", "#065F46"],
        ].map(([name, visa, status, bg, fg]) => (
          <div key={name} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "11px 14px", background: "#FFFFFF",
            border: "1px solid #E5E7EB", borderRadius: 8,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0A1628", letterSpacing: "-0.01em" }}>{name}</span>
              <span style={{ fontSize: 11, color: "#6B7280" }}>{visa}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px",
              borderRadius: 999, background: bg, color: fg,
            }}>
              {status}
            </span>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

/** University 목업 — 차트 + 서류 리스트 */
function UniversityMockup() {
  const bars = [
    ["베트남", 42, "#0BD8A2"],
    ["중국", 28, "#0A1628"],
    ["우즈벡", 18, "#B8944A"],
    ["몽골", 9, "#7C3AED"],
    ["기타", 3, "#9CA3AF"],
  ];
  const maxBar = 42;
  return (
    <MockupShell chromeTitle="k-alba.kr · 학교 행정 대시보드">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Chart */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            국가별 신청 현황
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bars.map(([country, val, color]) => (
              <div key={country} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 44, fontSize: 11, fontWeight: 600, color: "#374151" }}>{country}</div>
                <div style={{ flex: 1, height: 8, background: "#F3F4F6", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${(val / maxBar) * 100}%`, height: "100%", background: color, borderRadius: 999 }} />
                </div>
                <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: "#0A1628", textAlign: "right" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Document list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            확인서 발급 대기
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["김민수 · 컴공", "승인", "#D1FAE5", "#065F46"],
              ["호아 · 경영", "검토", "#FEF3C7", "#92400E"],
              ["체첸 · 디자인", "승인", "#D1FAE5", "#065F46"],
              ["올자스 · 화학", "반려", "#FEE2E2", "#991B1B"],
              ["수안 · 전자", "검토", "#FEF3C7", "#92400E"],
            ].map(([name, status, bg, fg]) => (
              <div key={name} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", background: "#F9FAFB",
                border: "1px solid #E5E7EB", borderRadius: 6,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0A1628" }}>{name}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 999, background: bg, color: fg,
                }}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer summary */}
      <div style={{
        marginTop: 14, padding: "10px 12px",
        background: "#F3F4F6", borderRadius: 6,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>
          이번 학기 누적 신청
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#0A1628" }}>
          1,284건
        </span>
      </div>
    </MockupShell>
  );
}

function AudienceMockup({ id }) {
  if (id === "workers") return <WorkerMockup />;
  if (id === "employers") return <EmployerMockup />;
  if (id === "universities") return <UniversityMockup />;
  return null;
}

export default function LandingPage() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [activeAudience, setActiveAudience] = useState("workers");

  // 세션 체크
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    getSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "worker");
      }
      setAuthChecked(true);
    });

    // 로그아웃 시 실시간 업데이트
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "worker");
      } else {
        setUser(null);
        setUserType(null);
      }
      setAuthChecked(true);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // 로딩 중
  if (!authChecked) {
    return <PageLoading message="잠시만 기다려주세요" minHeight={400} />;
  }

  return (
    <div style={{ background: T.paper, color: T.ink }}>

      {/* ═══════════════════ HERO ═══════════════════ */}
      {!user ? (
        // 비로그인 상태
        <section
          style={{
            padding: "80px 20px 96px",
            background: `linear-gradient(135deg, ${T.n9} 0%, #0F2037 100%)`,
            color: T.paper,
            position: "relative",
            overflow: "hidden",
            borderTop: `4px solid ${T.gold}`,
          }}
        >
          {/* Subtle background pattern */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(184, 148, 74, 0.06) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(184, 148, 74, 0.04) 0%, transparent 50%)`,
            pointerEvents: "none",
          }} />

          <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
            {/* 상단 워드마크 */}
            <div style={{ marginBottom: 56 }}>
              <KWordmark variant="dark" size={28} />
            </div>

            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: "clamp(36px, 5vw, 52px)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.04em",
                  marginBottom: 24,
                }}
              >
                한국 거주 외국인{" "}
                <em style={{
                  fontStyle: "normal",
                  background: `linear-gradient(135deg, ${T.gold} 0%, #D4A960 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>260만 명</em>
                을 위한<br />안전한 취업·채용 플랫폼
              </h1>
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.82)",
                  marginBottom: 40,
                  maxWidth: 680,
                  margin: "0 auto 40px",
                }}
              >
                비자 조건에 맞는 채용 공고부터 근로계약서 작성까지
                <br />외국인 근로자와 사업장을 위한 취업 절차를 지원합니다.
              </p>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 64 }}>
                <Button
                  variant="landingPrimary"
                  href="/jobs"
                  size="lg"
                  style={{
                    boxShadow: "0 4px 20px rgba(184, 148, 74, 0.4)",
                    padding: "16px 48px",
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  서비스 둘러보기 →
                </Button>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                  이미 계정이 있나요?{" "}
                  <a
                    href="/login"
                    style={{
                      color: T.gold,
                      fontWeight: 600,
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    로그인
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 32,
                  padding: "40px 0",
                  borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                  maxWidth: 900,
                  margin: "0 auto",
                }}
              >
                {[
                  ["260만", "한국 거주 외국인"],
                  ["12+", "대응 비자 유형"],
                  ["7", "지원 언어"],
                  ["3min", "근로계약 체결"],
                ].map(([num, label]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 40,
                        fontWeight: 900,
                        background: `linear-gradient(135deg, ${T.gold} 0%, #D4A960 100%)`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                        marginBottom: 12,
                      }}
                    >
                      {num}
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, fontWeight: 500 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : userType === "employer" ? (
        // 로그인 상태 - 사장님
        <section
          style={{
            padding: "48px 20px 56px",
            background: T.n9,
            color: T.paper,
            position: "relative",
            overflow: "hidden",
            borderTop: `3px solid ${T.gold}`,
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
            {/* 우측 상단 UserChip */}
            <div style={{ position: "absolute", top: -10, right: 0 }}>
              <UserChip user={user} />
            </div>

            {/* 상단 워드마크 */}
            <div style={{ marginBottom: 32 }}>
              <KWordmark variant="dark" size={22} />
            </div>

            <div style={{ fontSize: 32, marginBottom: 16 }}>👋</div>
            <h1
              style={{
                fontWeight: 800,
                fontSize: "clamp(26px, 6vw, 36px)",
                lineHeight: 1.25,
                letterSpacing: "-0.03em",
                marginBottom: 18,
              }}
            >
              안녕하세요,{" "}
              <em style={{ fontStyle: "normal", color: T.gold }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </em>{" "}
              사장님!
            </h1>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.78)",
                marginBottom: 24,
              }}
            >
              외국인 채용이 필요하신가요?<br />
              카카오톡 챗봇으로 3분만에 공고를 완성하세요.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <Button variant="landingPrimary" href="/my/jobs" size="lg">
                💼 내 공고 관리 →
              </Button>
              <Button
                variant="landingDark"
                href="/jobs/post"
                size="lg"
                style={{
                  background: "transparent",
                  color: T.paper,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                📢 새 공고 등록
              </Button>
            </div>
          </div>
        </section>
      ) : (
        // 로그인 상태 - 구직자
        <section
          style={{
            padding: "48px 20px 56px",
            background: T.n9,
            color: T.paper,
            position: "relative",
            overflow: "hidden",
            borderTop: `3px solid ${T.gold}`,
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto", position: "relative" }}>
            {/* 우측 상단 UserChip */}
            <div style={{ position: "absolute", top: -10, right: 0 }}>
              <UserChip user={user} />
            </div>

            {/* 상단 워드마크 */}
            <div style={{ marginBottom: 32 }}>
              <KWordmark variant="dark" size={22} />
            </div>

            <div style={{ fontSize: 32, marginBottom: 16 }}>👋</div>
            <h1
              style={{
                fontWeight: 800,
                fontSize: "clamp(26px, 6vw, 36px)",
                lineHeight: 1.25,
                letterSpacing: "-0.03em",
                marginBottom: 18,
              }}
            >
              안녕하세요,{" "}
              <em style={{ fontStyle: "normal", color: T.gold }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </em>
              님!
            </h1>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.78)",
                marginBottom: 24,
              }}
            >
              당신에게 맞는 새로운 알바를 찾아보세요.<br />
              비자 유형에 맞는 합법적인 일자리만 추천합니다.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
              <Button variant="landingPrimary" href="/jobs" size="lg">
                🔍 알바 찾기 →
              </Button>
              <Button
                variant="landingDark"
                href="/my/applications"
                size="lg"
                style={{
                  background: "transparent",
                  color: T.paper,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                📋 내 지원 내역
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ TARGET AUDIENCE CARDS ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInDown}
        style={{
          padding: "96px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInDown}
            style={{ textAlign: "center", marginBottom: 56 }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: T.goldL,
                color: T.navy,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                borderRadius: 24,
                marginBottom: 20,
              }}
            >
              Who We Serve
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "clamp(28px, 4vw, 38px)",
                lineHeight: 1.3,
                letterSpacing: "-0.03em",
                color: T.ink,
                marginBottom: 16,
              }}
            >
              모두를 위한 맞춤형 채용 플랫폼
            </h2>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerDownContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}
          >
            {[
              {
                icon: "🌏",
                label: "For Workers",
                title: "구직자를 위한 빠른 매칭",
                desc: "7개 언어 지원부터 시간제취업 확인서, 근로계약서 발급까지 외국인 유학생의 안전한 취업 절차를 지원합니다.",
                features: ["7개 언어 지원", "시간제취업 확인서 발급", "근로계약서 자동 작성", "합법적 취업 절차 지원"],
                color: "#0BD8A2",
                bgColor: "#E0F8EF",
              },
              {
                icon: "💼",
                label: "For Employers",
                title: "사장님을 위한\n효율적인 채용 관리",
                desc: "카카오톡 기반 간편 채용으로 외국인 인재 모집부터 근로계약까지 한 번에 관리하세요.",
                features: ["3분 공고 등록", "카카오톡 간편 채용", "근로계약서 자동 작성", "근로계약 관리"],
                color: "#C2512A",
                bgColor: "#F5E8E2",
              },
              {
                icon: "🏫",
                label: "For Universities",
                title: "학교 담당자를 위한\n학생 근로 운영 시스템",
                desc: "외국인 유학생 시간제취업 확인서 발급부터 관리까지 대학의 유학생 행정을 더 간편하고 체계적으로 운영하세요.",
                features: ["외국인 유학생 시간제취업 확인서 모바일 발급", "클릭 한 번으로 승인 및 관리", "유학생 불법 취업 최소화", "교육국제화역량 인증제(IEQAS) 대응"],
                color: "#7C3AED",
                bgColor: "#F5F3FF",
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={staggerDownItem}
                whileHover={prefersReducedMotion ? {} : {
                  y: -8,
                  boxShadow: "0 12px 32px rgba(10, 22, 40, 0.12)",
                  transition: { duration: 0.3 }
                }}
                style={{
                  background: T.paper,
                  border: `1.5px solid ${T.border}`,
                  borderRadius: 12,
                  padding: 32,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(10, 22, 40, 0.04)",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: item.bgColor,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    marginBottom: 24,
                  }}
                >
                  {item.icon}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: item.color,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  {item.label}
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: T.ink,
                    marginBottom: 12,
                    letterSpacing: "-0.02em",
                    whiteSpace: "pre-line",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: T.ink2,
                    lineHeight: 1.7,
                    marginBottom: 24,
                  }}
                >
                  {item.desc}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {item.features.map((feature) => (
                    <div
                      key={feature}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 14,
                        color: T.ink,
                      }}
                    >
                      <span style={{ color: item.color, fontWeight: 700 }}>✓</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ PROBLEM (크림 배경) ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
        style={{
          padding: "96px 20px",
          background: T.cream,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.h2
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            style={{
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 28px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 32,
            }}
          >
            외국인 취업 과정에서 발생하는{" "}
            <span style={{ color: T.accent }}>어려움</span>
          </motion.h2>

          {/* 3가지 이유 - 3열 카드 */}
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          >
            {[
              ["1", "언어 장벽", "알바 플랫폼 대부분은 한국어 중심으로 운영됩니다. 외국인 구직자는 공고 내용, 급여 조건, 계약 조항을 이해하기 어려운 경우가 많습니다."],
              ["2", "복잡한 취업 절차", "외국인 유학생은 시간제취업 신청, 확인서 발급 등 복잡한 절차를 거쳐야 합니다. 절차와 정보 접근이 어려워 정식적인 취업 과정을 진행하기 힘든 경우가 많습니다."],
              ["3", "비공식 취업 구조", "취업 절차와 관리 체계가 복잡하다 보니 외국인 근로자가 비공식적이거나 불법적인 경로로 취업하게 되는 사례가 발생합니다."],
            ].map(([num, title, desc]) => (
              <motion.div
                key={num}
                variants={staggerItem}
                style={{
                  padding: 24,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    background: T.n9,
                    color: T.gold,
                    fontWeight: 800,
                    fontSize: 16,
                    borderRadius: 4,
                    marginBottom: 16,
                  }}
                >
                  {num}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    marginBottom: 10,
                    color: T.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.7 }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ AUDIENCE TABS (Workers / Employers / Universities) ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={fadeInUp}
        style={{
          padding: "clamp(80px, 10vw, 120px) 20px",
          background: "#F8F9FA",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* SECTION INTRO */}
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: T.navy,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Who We Support
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 3.6vw, 36px)",
                fontWeight: 800,
                color: T.ink,
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
                marginBottom: 10,
              }}
            >
              역할별 핵심 기능
            </h2>
            <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.7, letterSpacing: "-0.01em" }}>
              역할을 선택하면 맞춤 기능을 확인할 수 있습니다
            </p>
          </div>

          {/* TAB HEADER */}
          <div
            role="tablist"
            aria-label="K-ALBA audience tabs"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginBottom: 56,
              flexWrap: "wrap",
            }}
          >
            {AUDIENCE_TABS.map((tab) => {
              const active = activeAudience === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveAudience(tab.id)}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "#FFFFFF";
                      e.currentTarget.style.borderColor = "#CBD5E1";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                  style={{
                    minWidth: 260,
                    padding: "18px 28px",
                    background: active ? T.navy : "transparent",
                    color: active ? "#FFFFFF" : T.ink2,
                    border: `1px solid ${active ? T.navy : "#E5E7EB"}`,
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: active ? "0 8px 24px rgba(10, 22, 40, 0.22)" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      opacity: active ? 0.75 : 0.55,
                    }}
                  >
                    {tab.en}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: active ? 800 : 700, letterSpacing: "-0.015em" }}>
                    {tab.kr}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB CONTENT (fade + 45/55 split) */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeAudience}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 45fr) minmax(0, 55fr)",
                gap: 56,
                alignItems: "center",
              }}
              className="audience-tab-content"
            >
              {(() => {
                const tab =
                  AUDIENCE_TABS.find((t) => t.id === activeAudience) ?? AUDIENCE_TABS[0];
                return (
                  <>
                    {/* LEFT: copy + checklist */}
                    <div>
                      <h3
                        style={{
                          fontSize: "clamp(24px, 2.8vw, 32px)",
                          fontWeight: 800,
                          color: T.ink,
                          lineHeight: 1.3,
                          letterSpacing: "-0.025em",
                          marginBottom: 36,
                        }}
                      >
                        {tab.title}
                        <br />
                        <span style={{ color: T.navy }}>{tab.titleAccent}</span>
                      </h3>
                      <ul style={{ display: "flex", flexDirection: "column", gap: 14, listStyle: "none", padding: 0, margin: 0 }}>
                        {tab.items.map(([icon, text]) => (
                          <li
                            key={text}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 14,
                              padding: "18px 20px",
                              background: "#FFFFFF",
                              border: "1px solid #E5E7EB",
                              borderRadius: 10,
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#CBD5E1";
                              e.currentTarget.style.boxShadow = "0 4px 12px rgba(10, 22, 40, 0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#E5E7EB";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{icon}</span>
                            <span
                              style={{
                                fontSize: 15,
                                color: T.ink,
                                lineHeight: 1.55,
                                letterSpacing: "-0.01em",
                                fontWeight: 600,
                              }}
                            >
                              {text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* RIGHT: UI mockup */}
                    <div>
                      <AudienceMockup id={tab.id} />
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>

        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            :global(.audience-tab-content) {
              grid-template-columns: 1fr !important;
              gap: 32px !important;
            }
          }
        `}</style>
      </motion.section>

      {/* ═══════════════════ PROCESS (horizontal timeline) ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={fadeInUp}
        style={{
          padding: "clamp(80px, 10vw, 120px) 20px",
          background: T.paper,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Intro */}
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: T.gold,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              Process
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 3.6vw, 36px)",
                fontWeight: 800,
                color: T.ink,
                letterSpacing: "-0.025em",
                lineHeight: 1.25,
                marginBottom: 12,
              }}
            >
              <span style={{ color: T.gold }}>5단계, 평균 3분.</span>{" "}
              카카오톡을 쓸 줄 안다면 누구나
            </h2>
            <p style={{ fontSize: 16, color: T.ink2, lineHeight: 1.7, letterSpacing: "-0.01em" }}>
              공고 탐색부터 근무 시작까지, 한 화면에서 흐르듯 이어집니다.
            </p>
          </div>

          {/* Timeline grid */}
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: 20,
              position: "relative",
            }}
            className="process-timeline"
          >
            {[
              ["🔍", "공고 탐색", "비자·언어로 빠르게 좁히기"],
              ["💬", "챗봇 지원", "카카오톡 5단계 질의응답"],
              ["👤", "사장님 검토", "지원 후 사장님 응답"],
              ["📝", "계약 체결", "자동 생성·양측 서명"],
              ["🚀", "근무 시작", "PDF 보관·이력 적립"],
            ].map(([icon, title, desc], i) => (
              <motion.div
                key={title}
                variants={staggerItem}
                whileHover={prefersReducedMotion ? {} : {
                  y: -4,
                  boxShadow: "0 14px 36px rgba(10, 22, 40, 0.08)",
                  borderColor: T.gold,
                  transition: { duration: 0.25 },
                }}
                style={{
                  position: "relative",
                  padding: "32px 22px 26px",
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Faded huge step number */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -26,
                    right: -6,
                    fontSize: 110,
                    fontWeight: 900,
                    color: T.navy,
                    opacity: 0.055,
                    lineHeight: 1,
                    letterSpacing: "-0.055em",
                    pointerEvents: "none",
                    fontFamily: "inherit",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Connector arrow (between cards, hidden on last) */}
                {i < 4 && (
                  <div
                    aria-hidden="true"
                    className="process-connector"
                    style={{
                      position: "absolute",
                      top: "50%",
                      right: -15,
                      transform: "translateY(-50%)",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: T.gold,
                      zIndex: 3,
                      pointerEvents: "none",
                    }}
                  >
                    →
                  </div>
                )}

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 16 }}>{icon}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: T.gold,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    Step {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: T.ink,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.3,
                      marginBottom: 6,
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: T.ink2,
                      lineHeight: 1.55,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <style jsx>{`
          @media (max-width: 1000px) {
            :global(.process-timeline) {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            :global(.process-connector) {
              display: none !important;
            }
          }
          @media (max-width: 540px) {
            :global(.process-timeline) {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </motion.section>

      {/* ═══════════════════ FINAL CTA (dark navy banner) ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
        style={{
          padding: "clamp(100px, 12vw, 140px) 20px",
          background: `linear-gradient(135deg, #061021 0%, ${T.navy} 50%, #1A2D4D 100%)`,
          color: T.paper,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative radial glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            height: "120%",
            background: "radial-gradient(ellipse at center, rgba(184, 148, 74, 0.14) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />
        {/* Subtle grid lines (infra texture) */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
            maskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, transparent 75%)",
          }}
        />

        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
              gap: 64,
              alignItems: "center",
            }}
            className="final-cta-grid"
          >
            {/* LEFT: text */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: T.gold,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                K-ALBA · Korea Foreign Workforce Infrastructure
              </div>
              <h2
                style={{
                  fontSize: "clamp(32px, 4.8vw, 52px)",
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: "-0.03em",
                  marginBottom: 22,
                  color: "#FFFFFF",
                }}
              >
                한국의 외국인 근로 인프라를{" "}
                <span
                  style={{
                    background: `linear-gradient(135deg, ${T.gold} 0%, #D4A960 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  함께 만들어 갑시다
                </span>
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: "rgba(255,255,255,0.72)",
                  lineHeight: 1.7,
                  letterSpacing: "-0.01em",
                  maxWidth: 540,
                }}
              >
                외국인 근로자, 사업장, 학교가 만나는 통합 행정 플랫폼.
                <br />
                지금 바로 무료로 시작하세요.
              </p>
            </div>

            {/* RIGHT: CTA stack */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 0,
              }}
              className="final-cta-buttons"
            >
              <a
                href="/signup"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 22px 56px rgba(184, 148, 74, 0.45), inset 0 1px 0 rgba(255,255,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 16px 44px rgba(184, 148, 74, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)";
                }}
                style={{
                  display: "block",
                  padding: "22px 36px",
                  background: `linear-gradient(135deg, ${T.gold} 0%, #D4A960 100%)`,
                  color: T.navy,
                  fontSize: 18,
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: 12,
                  textDecoration: "none",
                  letterSpacing: "-0.015em",
                  boxShadow: "0 16px 44px rgba(184, 148, 74, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                K-ALBA 시작하기 →
              </a>
              <a
                href={`mailto:${COMPANY.email}`}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                }}
                style={{
                  display: "block",
                  padding: "18px 28px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: "center",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: 12,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                  transition: "all 0.25s ease",
                }}
              >
                문의하기
              </a>
            </div>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 900px) {
            :global(.final-cta-grid) {
              grid-template-columns: 1fr !important;
              gap: 36px !important;
              text-align: center !important;
            }
            :global(.final-cta-grid) p {
              margin-left: auto !important;
              margin-right: auto !important;
            }
          }
        `}</style>
      </motion.section>

      {/* ═══════════════════ FOOTER (BI v2 신규: 회사 정보 노출) ═══════════════════ */}
      <footer
        style={{
          padding: "48px 20px",
          background: T.paper,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* 상단: 로고 + 링크 가로 배치 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <KWordmark size={20} />
              <span style={{ fontSize: 13, color: T.ink3 }}>
                외국인과 사장님을 잇는 카톡 알바 플랫폼
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 24,
                fontSize: 13,
                color: T.ink3,
              }}
            >
              <a href="/terms" style={{ color: T.ink3, textDecoration: "none", fontWeight: 600 }}>이용약관</a>
              <a href="/privacy" style={{ color: T.ink3, textDecoration: "none", fontWeight: 600 }}>개인정보처리방침</a>
            </div>
          </div>

          {/* 하단: 회사 정보 (2줄 구조) */}
          <div
            style={{
              fontSize: 12,
              color: T.ink3,
              paddingTop: 24,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            {/* 첫 번째 줄: 회사명 (좌) + 저작권 (우) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: T.ink2 }}>{COMPANY.name}</span>
              <span style={{ fontSize: 11, color: T.ink3 }}>© 2026 {COMPANY.brandName}. All rights reserved.</span>
            </div>

            {/* 두 번째 줄: 법적 정보 (왼쪽 정렬) */}
            <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.6 }}>
              대표: {COMPANY.ceo} | 사업자등록번호: {COMPANY.businessNumber} | 직업정보제공사업 신고번호: {COMPANY.jobInfoLicense} | 주소: {COMPANY.address}
            </div>
          </div>
        </div>
      </footer>

      {/* 플로팅 카카오톡 버튼 */}
      <KakaoFloatingButton />
    </div>
  );
}
