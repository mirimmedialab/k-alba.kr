"use client";
import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

export default function LandingPage() {
  const t = useT();
  const prefersReducedMotion = useReducedMotion();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);

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
                을 위한<br />합법적 알바 플랫폼
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
                비자별 맞춤 공고, 7개 언어 지원, 카카오톡 챗봇으로 3분 만에 근로계약서까지.
                <br />신뢰할 수 있는 외국인 채용 플랫폼입니다.
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
              세 가지 대상을 위한 전문 솔루션
            </h2>
            <p style={{ fontSize: 17, color: T.ink2, lineHeight: 1.7, maxWidth: 640, margin: "0 auto" }}>
              외국인 구직자, 채용 기업, 대학 담당자 모두를 위한<br />맞춤형 채용 플랫폼
            </p>
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
                title: "사장님을 위한 효율적인 채용 관리",
                desc: "카카오톡 기반 간편 채용으로 외국인 인재 모집부터 근로계약까지 한 번에 관리하세요.",
                features: ["3분 공고 등록", "카카오톡 간편 채용", "근로계약서 자동 작성", "근로계약 관리"],
                color: "#C2512A",
                bgColor: "#F5E8E2",
              },
              {
                icon: "🏫",
                label: "For Universities",
                title: "학교 담당자를 위한 학생 근로 운영 시스템",
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

      {/* ═══════════════════ WORKER FEATURES ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={rotateUnfold}
        style={{
          padding: "96px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInDown}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: T.abg || T.accentBg,
                color: T.accent,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 14,
                borderRadius: 2,
              }}
            >
              For Workers · 외국인 구직자
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "clamp(20px, 5vw, 28px)",
                lineHeight: 1.35,
                letterSpacing: "-0.025em",
                color: T.ink,
                marginBottom: 32,
              }}
            >
              한국어를 잘 못해도, 비자가 복잡해도 —{" "}
              <span style={{ color: T.accent }}>안심하고 알바할 수 있습니다</span>
            </h2>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={rotateUnfoldContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
          >
            {[
              ["🌐", "내 언어로 알바 찾기", "한국어·영어·중국어·베트남어·우즈벡어·몽골어·일본어 7개 언어 지원."],
              ["🛂", "내 비자에 맞는 공고만", "비자 유형 입력하면 합법적으로 일할 수 있는 공고만 자동 필터링."],
              ["📝", "근로계약서 자동 발급", "변호사 검토 완료 양식을 카톡 챗봇으로 3분 만에 서명."],
              ["💰", "최저시급 보장 확인", "시급 10,030원 미달 공고는 경고 표시, 주휴수당 자동 안내."],
              ["💬", "전화 없이 카톡으로", "5단계 카카오톡 챗봇으로 지원부터 합격까지 완료."],
              ["⭐", "K-ALBA 인증 경력", "근무 완료 시 사장님 평가와 함께 경력 자동 적립."],
            ].map(([ic, title, desc]) => (
              <motion.div
                key={title}
                variants={rotateUnfoldItem}
                whileHover={prefersReducedMotion ? {} : {
                  y: -4,
                  borderColor: T.accent,
                  boxShadow: "0 8px 24px rgba(10, 22, 40, 0.08)",
                  transition: { duration: 0.3 }
                }}
                style={{
                  padding: 20,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 10 }}>{ic}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: T.ink,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ EMPLOYER FEATURES (크림 배경) ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={scaleBlur}
        style={{
          padding: "96px 20px",
          background: T.cream,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInDown}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                background: T.n9,
                color: T.gold,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 14,
                borderRadius: 2,
              }}
            >
              For Employers · 사장님
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "clamp(20px, 5vw, 28px)",
                lineHeight: 1.35,
                letterSpacing: "-0.025em",
                color: T.ink,
                marginBottom: 32,
              }}
            >
              외국인 채용이 어렵고 복잡했나요?{" "}
              <span style={{ color: T.accent }}>K-ALBA가 다 해드립니다</span>
            </h2>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={scaleBlurContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
          >
            {[
              ["📢", "카카오톡으로 3분 공고 등록", "14단계 챗봇 질문에 답하면 공고 자동 완성."],
              ["🛂", "비자 자동 확인", "지원자의 비자를 자동 검증. 불법 고용 위험 없이 채용."],
              ["📝", "근로계약서 자동 생성", "공고 정보가 계약서에 자동 입력, 법무법인 검토 완료."],
              ["💼", "인력난 해소", "260만 외국인 근로자 풀에 직접 접근."],
              ["🔍", "국세청 인증 사업주", "사업자번호 실시간 검증으로 인증 배지 부여."],
              ["📊", "지역·업종별 시세 안내", "13개 업종 × 지역별 평균 급여 실시간 제공."],
            ].map(([ic, title, desc]) => (
              <motion.div
                key={title}
                variants={scaleBlurItem}
                whileHover={prefersReducedMotion ? {} : {
                  y: -4,
                  borderColor: T.gold,
                  boxShadow: "0 8px 24px rgba(10, 22, 40, 0.08)",
                  transition: { duration: 0.3 }
                }}
                style={{
                  padding: 20,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 10 }}>{ic}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: T.ink,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ UNIVERSITY FEATURES ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={slideFromLeft}
        style={{
          padding: "96px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInDown}
          >
            <div
              style={{
                display: "inline-block",
                color: T.navy,
                background: T.gold,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                marginBottom: 14,
                borderRadius: 2,
              }}
            >
              For Universities · 학교 담당자
            </div>
            <h2
              style={{
                fontWeight: 800,
                fontSize: "clamp(20px, 5vw, 28px)",
                lineHeight: 1.35,
                letterSpacing: "-0.025em",
                color: T.ink,
                marginBottom: 32,
              }}
            >
              유학생 시간제취업, <em style={{ fontStyle: "normal", color: T.accent }}>이제 사무실 컴퓨터 없이</em>
            </h2>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={slideFromLeftContainer}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}
          >
            {[
              ["⚡", "24시간 내 모바일 처리", "카카오톡으로 신청서 받아 모바일에서 즉시 검토·서명. 학생을 기다리게 하지 않습니다."],
              ["📄", "확인서 자동 생성", "손글씨 서명 한 번이면 PDF 자동 발급. 학교 인장도 디지털로 적용됩니다."],
              ["⚖️", "출입국관리법 자동 준수", "출석률 70% 미만, C학점 미만 학생 자동 차단. 위반 조건을 시스템이 검증합니다."],
              ["🏆", "IEQAS 평가 가점", "유학생 관리 시스템 도입으로 교육국제화역량인증 평가 가산점 확보."],
              ["📊", "실시간 대시보드", "학과별·국가별 시간제취업 신청 현황을 한눈에 파악. 승인·반려 추이 실시간 추적."],
            ].map(([ic, title, desc]) => (
              <motion.div
                key={title}
                variants={slideFromLeftItem}
                whileHover={prefersReducedMotion ? {} : {
                  y: -4,
                  borderColor: T.gold,
                  boxShadow: "0 8px 24px rgba(10, 22, 40, 0.08)",
                  transition: { duration: 0.3 }
                }}
                style={{
                  padding: 20,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 10 }}>{ic}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: T.ink,
                    marginBottom: 6,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ PROCESS ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeInUp}
        style={{
          padding: "96px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
            <em style={{ fontStyle: "normal", color: T.gold }}>5단계, 평균 3분.</em>{" "}
            카카오톡을 쓸 줄 안다면 누구나
          </motion.h2>

          {/* 5단계 - 가로 타임라인 */}
          <motion.div
            initial={prefersReducedMotion ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={staggerContainer}
            style={{ position: "relative" }}
          >
            {/* 가로 연결선 */}
            <div
              style={{
                position: "absolute",
                left: "10%",
                right: "10%",
                top: 28,
                height: 2,
                background: T.border,
                zIndex: 0,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              {[
                ["1", "공고 탐색", "비자·언어 자동 필터"],
                ["2", "챗봇 지원", "5단계 질문 응답"],
                ["3", "사장님 검토", "24시간 내 응답"],
                ["4", "계약 체결", "자동 생성·양측 서명"],
                ["5", "근무 시작", "PDF 보관, 이력 적립"],
              ].map(([num, title, desc]) => (
                <motion.div
                  key={num}
                  variants={staggerItem}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      background: T.n9,
                      color: T.gold,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 800,
                      borderRadius: "50%",
                      margin: "0 auto 16px",
                      border: `3px solid ${T.paper}`,
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.ink,
                      marginBottom: 6,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
                    {desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <motion.section
        initial={prefersReducedMotion ? "visible" : "hidden"}
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUp}
        style={{
          padding: "96px 20px",
          background: `linear-gradient(135deg, ${T.n9} 0%, #0F2037 100%)`,
          color: T.paper,
          borderTop: `4px solid ${T.gold}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle background pattern */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(184, 148, 74, 0.08) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        <motion.div
          initial={prefersReducedMotion ? "visible" : "hidden"}
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}
        >
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(22px, 5vw, 30px)",
              lineHeight: 1.3,
              letterSpacing: "-0.025em",
              marginBottom: 16,
            }}
          >
            한국의 외국인 근로 인프라를{" "}
            <em style={{ fontStyle: "normal", color: T.gold }}>
              함께 만들어 갑시다
            </em>
          </h2>
          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.78)",
              marginBottom: 24,
              lineHeight: 1.65,
            }}
          >
            지금 바로 무료로 시작하세요.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="landingPrimary" href="/signup" size="lg" fullWidth>
              무료로 시작하기 →
            </Button>
            <Button
              variant="landingDark"
              href={`mailto:${COMPANY.email}`}
              size="lg"
              fullWidth
              style={{
                background: "transparent",
                color: T.paper,
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              문의하기
            </Button>
          </div>
        </motion.div>
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
