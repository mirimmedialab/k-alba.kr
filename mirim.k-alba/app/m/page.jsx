"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getSession, supabase } from "@/lib/supabase";
import { UserChip } from "@/components/UserChip";
import { T, COMPANY } from "@/lib/theme";
import { Button, KIcon, KWordmark, PageLoading } from "@/components/ui";
import { useT, useLocale } from "@/lib/i18n";
import { KakaoFloatingButton } from "@/components/KakaoFloatingButton";

/**
 * 모바일 랜딩 페이지 (BI v2 적용)
 *
 * BI v2 결정 문서 Section 3.3 기준:
 *   - 컬러: 코랄(T.coral) + 민트(T.mint) + 크림(T.cream) — "친근, 따뜻"
 *   - 분위기: 당근마켓 풍, "친구의 추천"
 *   - 핵심: 외국인 알바생 30% + 유학생 20% (모바일 사용자) 첫인상
 *
 * 변경점 (BI v2):
 *   - M 객체 → T 토큰으로 통합 (정확한 BI v2 컬러)
 *   - MBtn → Button 컴포넌트 (Step 3-A)
 *   - K 로고 인라인 박스 → KIcon / KWordmark 컴포넌트
 *   - 사업자번호 placeholder → COMPANY 실값 (신뢰감 강화)
 *   - 로딩 → PageLoading 컴포넌트
 *
 * 보존:
 *   - 8초 hero 토글 (구직자/사장님 교차)
 *   - Phone Mockup의 채팅/알바 추천 디자인
 *   - 4단계 섹션 구조 (HERO → TRUST → STATS → 카드 섹션 3개 → 후기 → CTA → 푸터)
 *   - heroFade 키프레임 애니메이션
 *   - 모든 카피와 콘텐츠
 */

// ─────────── 모바일 Audience 캐러셀 데이터 ───────────
// 컬러는 모바일 BI(코랄/민트/보라) 유지, 카드 1장에 체크리스트 3개로 간결화
const AUDIENCE_TABS_M = [
  {
    id: "workers",
    icon: "🌏",
    labelKey: "audWorkerKr",
    accent: "#4F46E5",
    gradient: "linear-gradient(135deg,#EEF2FF,#E0E7FF)",
    border: "#C7D2FE",
    titleKey: "mAudWorkerTitle",
    itemKeys: [
      "mAudWorkerI1",
      "mAudWorkerI2",
      "mAudWorkerI3",
    ],
  },
  {
    id: "employers",
    icon: "💼",
    labelKey: "audEmployerKr",
    accent: "#FF6B5A",
    gradient: "linear-gradient(135deg,#FFE8E4,#FFE4E0)",
    border: "rgba(255,107,90,0.25)",
    titleKey: "mAudEmployerTitle",
    itemKeys: [
      "mAudEmployerI1",
      "mAudEmployerI2",
      "mAudEmployerI3",
    ],
  },
  {
    id: "universities",
    icon: "🏫",
    labelKey: "audUniKr",
    accent: "#7C3AED",
    gradient: "linear-gradient(135deg,#F5F3FF,#EDE9FE)",
    border: "#DDD6FE",
    titleKey: "mAudUniTitle",
    itemKeys: [
      "mAudUniI1",
      "mAudUniI2",
      "mAudUniI3",
    ],
  },
];

// ─────────── 모바일 후기 데이터 ───────────
// 1~2줄 짧은 강조 멘트 + 작성자 정보 (작고 그레이)
const TESTIMONIALS_M = [
  {
    quoteKey: "mTesti1Quote",
    flag: "🇻🇳",
    name: "흐엉",
    role: "베트남 · 서울대 유학생",
    bg: "#EEF2FF",
  },
  {
    quoteKey: "mTesti2Quote",
    flag: "🇰🇷",
    name: "박영호",
    role: "평택 딸기농장 대표",
    bg: "#FFFBEB",
  },
  {
    quoteKey: "mTesti3Quote",
    flag: "🇰🇭",
    name: "Sokha M.",
    role: "캄보디아 · 결혼이민자",
    bg: "#FFF7ED",
  },
  {
    quoteKey: "mTesti4Quote",
    flag: "🇰🇷",
    name: "김민수",
    role: "이태원 음식점 대표",
    bg: "#ECFDF5",
  },
];

export default function MobileLandingPage() {
  const t = useT();
  const { locale } = useLocale();
  const S = {
    section: { maxWidth: 600, margin: "0 auto", padding: "0 20px" },
    label: { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2.5, marginBottom: 10, color: T.mint },
    title: { fontSize: 28, fontWeight: 900, color: T.navy, marginBottom: 10, letterSpacing: -0.5 },
    desc: { fontSize: 14, color: T.ink3, lineHeight: 1.8, marginBottom: 36 },
  };

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTouchX = useRef(0);
  const heroLastInteract = useRef(0); // 수동 스와이프 후 자동순환 잠시 멈춤
  const goHero = (dir) => {
    heroLastInteract.current = Date.now();
    setHeroIdx((p) => (p + dir + 3) % 3);
  };
  const jumpHero = (i) => {
    heroLastInteract.current = Date.now();
    setHeroIdx(i);
  };
  // ───────── Audience 캐러셀: Clone 노드 기반 무한 루프 ─────────
  // 트랙: [cloneLast, ...AUDIENCE_TABS_M, cloneFirst]  → 길이 N+2
  // audienceSlide: 1..N (canonical) — 0 / N+1 은 클론을 잠깐 보여주고 점프
  const audienceN = AUDIENCE_TABS_M.length;
  const audienceTrackCount = audienceN + 2;
  const [audienceSlide, setAudienceSlide] = useState(1);
  const [audienceTransition, setAudienceTransition] = useState(true);
  const [audienceDragX, setAudienceDragX] = useState(0);
  const audienceDragRef = useRef(null);
  const audienceLogicalIdx = ((audienceSlide - 1) + audienceN) % audienceN;

  const goAudienceNext = () => setAudienceSlide((s) => s + 1);
  const goAudiencePrev = () => setAudienceSlide((s) => s - 1);
  const goAudienceTo = (logical) => setAudienceSlide(logical + 1);

  const handleAudienceTransitionEnd = () => {
    if (audienceSlide === audienceN + 1) {
      // cloneFirst 보여준 직후 → 진짜 첫 카드로 점프 (transition 끄고)
      setAudienceTransition(false);
      setAudienceSlide(1);
    } else if (audienceSlide === 0) {
      // cloneLast 보여준 직후 → 진짜 마지막 카드로 점프
      setAudienceTransition(false);
      setAudienceSlide(audienceN);
    }
  };

  // 점프 직후 다음 프레임에서 transition 재활성화 (사용자에게는 보이지 않음)
  useEffect(() => {
    if (audienceTransition) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setAudienceTransition(true))
    );
    return () => cancelAnimationFrame(id);
  }, [audienceTransition]);

  // 라이브 드래그 — 손가락 따라가는 finger-follow
  const handleAudienceTouchStart = (e) => {
    audienceDragRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      direction: null,
    };
  };
  const handleAudienceTouchMove = (e) => {
    const start = audienceDragRef.current;
    if (!start) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    // 방향이 정해지지 않았으면 5px 이상 움직였을 때 결정
    if (!start.direction && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      start.direction = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (start.direction === "horizontal") setAudienceTransition(false);
    }
    if (start.direction === "horizontal") setAudienceDragX(dx);
  };
  const handleAudienceTouchEnd = (e) => {
    const start = audienceDragRef.current;
    if (!start) return;
    const dx = (e.changedTouches[0]?.clientX || start.x) - start.x;
    audienceDragRef.current = null;
    if (start.direction === "horizontal") {
      setAudienceTransition(true);
      setAudienceDragX(0);
      if (Math.abs(dx) > 60) {
        if (dx < 0) goAudienceNext();
        else goAudiencePrev();
      }
    }
  };

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const testimonialTrackRef = useRef(null);
  const testiTouchX = useRef(0);
  const testiLastInteract = useRef(0); // 수동 조작 후 자동회전 잠시 멈춤

  // 후기 수동 이동 (스와이프/점 클릭)
  const goTestimonial = (dir) => {
    testiLastInteract.current = Date.now();
    setTestimonialIdx((i) => {
      const n = TESTIMONIALS_M.length;
      return dir < 0 ? (i - 1 + n) % n : (i + 1) % n;
    });
  };
  const jumpTestimonial = (i) => {
    testiLastInteract.current = Date.now();
    setTestimonialIdx(i);
  };

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

  // 8초마다 hero 3개 패널 (구직자 → 사장님 → 학교 담당자) 사이클
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - heroLastInteract.current < 10000) return;
      setHeroIdx((p) => (p + 1) % 3);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // 후기 자동 회전 (4초 간격, 무한 루프) — 수동 조작 직후 6초간은 멈춤
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - testiLastInteract.current < 6000) return;
      setTestimonialIdx((i) => (i + 1) % TESTIMONIALS_M.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  const isSeeker = heroIdx === 0;
  const isEmployerHero = heroIdx === 1;
  const isUniversityHero = heroIdx === 2;

  // 로딩 중
  if (!authChecked) {
    return <PageLoading message={t("partwork.loading")} minHeight={400} />;
  }

  return (
    <div key={locale} style={{ overflowX: "clip" }}>
      {/* ── HERO ── */}
      <div style={{ ...S.section, paddingTop: 32, paddingBottom: 32 }}>
        {!user ? (
          // 비로그인 — 8초마다 구직자/사장님 슬라이드 (좌우 트랙)
          <div style={{ marginBottom: 28 }}>
            {/* Hero text slide track (3 panels) */}
            <div
              style={{ overflow: "hidden", touchAction: "pan-y" }}
              onTouchStart={(e) => { heroTouchX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - heroTouchX.current;
                if (Math.abs(dx) > 40) goHero(dx < 0 ? 1 : -1);
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "300%",
                  transform: `translate3d(${heroIdx * -(100 / 3)}%, 0, 0)`,
                  transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
                  willChange: "transform",
                }}
              >
                {/* Seeker panel */}
                <div
                  aria-hidden={!isSeeker}
                  style={{
                    width: `${100 / 3}%`,
                    flexShrink: 0,
                    textAlign: "center",
                    padding: "0 4px",
                    opacity: isSeeker ? 1 : 0.35,
                    transition: "opacity 0.6s ease-in-out",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.mintL, color: "#059669", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                    {t("landing.mHeroBadgeSeeker")}
                  </div>
                  <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: T.navy, marginBottom: 16, letterSpacing: -1 }}>
                    {t("landing.mHeroSeekerTitle1")}<br />
                    <span style={{ background: "linear-gradient(135deg,#0BD8A2,#06B889)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {t("landing.mHeroSeekerTitle2")}
                    </span>
                  </h1>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: T.ink2, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                    {t("landing.mHeroSeekerDesc1")}<br />{t("landing.mHeroSeekerDesc2")}
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button variant="primary" href="/login">{t("landing.seekerCta")}</Button>
                    <Button variant="secondary" href="/login">{t("landing.haveAccount")}</Button>
                  </div>
                </div>

                {/* Employer panel */}
                <div
                  aria-hidden={!isEmployerHero}
                  style={{
                    width: `${100 / 3}%`,
                    flexShrink: 0,
                    textAlign: "center",
                    padding: "0 4px",
                    opacity: isEmployerHero ? 1 : 0.35,
                    transition: "opacity 0.6s ease-in-out",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.coralL, color: T.coral, padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                    {t("landing.mHeroBadgeEmployer")}
                  </div>
                  <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: T.navy, marginBottom: 16, letterSpacing: -1 }}>
                    {t("landing.mHeroEmployerTitle1")}<br />
                    <span style={{ background: `linear-gradient(135deg,${T.coral},#FF8A7A)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {t("landing.mHeroEmployerTitle2")}
                    </span>
                  </h1>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: T.ink2, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                    {t("landing.mHeroEmployerDesc1")}<br />{t("landing.mHeroEmployerDesc2")}
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button variant="primary" href="/login" style={{ boxShadow: `0 4px 16px ${T.coral}40` }}>
                      {t("landing.employerCta")}
                    </Button>
                    <Button variant="secondary" href="/login">{t("landing.haveAccount")}</Button>
                  </div>
                </div>

                {/* University panel */}
                <div
                  aria-hidden={!isUniversityHero}
                  style={{
                    width: `${100 / 3}%`,
                    flexShrink: 0,
                    textAlign: "center",
                    padding: "0 4px",
                    opacity: isUniversityHero ? 1 : 0.35,
                    transition: "opacity 0.6s ease-in-out",
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F5F3FF", color: "#7C3AED", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                    {t("landing.mHeroBadgeUni")}
                    <span style={{ fontSize: 10, fontWeight: 700, color: T.ink3, background: "#fff", padding: "1px 6px", borderRadius: 4, marginLeft: 2 }}>
                      {t("landing.mComingSoon")}
                    </span>
                  </div>
                  <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: T.navy, marginBottom: 16, letterSpacing: -1 }}>
                    {t("landing.mHeroUniTitle1")}<br />
                    <span style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {t("landing.mHeroUniTitle2")}
                    </span>
                  </h1>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: T.ink2, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                    {t("landing.mHeroUniDesc1")}<br />{t("landing.mHeroUniDesc2")}
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <Button variant="primary" disabled style={{ boxShadow: `0 4px 16px ${T.coral}40` }}>
                      {t("landing.mHeroUniCta")}
                    </Button>
                    <Button variant="secondary" disabled>{t("landing.haveAccount")}</Button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => jumpHero(i)}
                  aria-label={i === 0 ? t("landing.mDotSeeker") : i === 1 ? t("landing.mDotEmployer") : t("landing.mDotUni")}
                  style={{
                    width: i === heroIdx ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background:
                      i === heroIdx
                        ? i === 0
                          ? T.mint
                          : i === 1
                            ? T.coral
                            : "#7C3AED"
                        : T.borderStrong,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease-in-out",
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: T.ink3, textAlign: "center" }}>
              {t("landing.mAllRoles")}<span style={{ color: T.mint, fontWeight: 700 }}>{t("landing.mAllFree")}</span>
            </div>
          </div>
        ) : userType === "employer" ? (
          // 로그인 상태 - 사장님
          <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
            {/* 우측 상단 UserChip */}
            <div style={{ position: "absolute", top: -10, right: 0 }}>
              <UserChip user={user} style={{ justifyContent: "flex-end" }} />
            </div>

            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.coralL, color: T.coral, padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
              {t("landing.mBadgeEmployer")}
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: T.navy, marginBottom: 16, letterSpacing: -1 }}>
              {t("landing.mGreetingHello")}<br />
              <span style={{ background: `linear-gradient(135deg,${T.coral},#FF8A7A)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </span>{t("landing.mEmployerSuffix")}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: T.ink2, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              {t("landing.mEmployerSub1")}<br />
              {t("landing.mEmployerSub2")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" href="/my/jobs" style={{ boxShadow: `0 4px 16px ${T.coral}40` }}>
                {t("landing.empBtnMyJobs")}
              </Button>
              <Button variant="secondary" href="/jobs/post">{t("landing.empBtnNewJob")}</Button>
            </div>
          </div>
        ) : (
          // 로그인 상태 - 구직자
          <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
            {/* 우측 상단 UserChip */}
            <div style={{ position: "absolute", top: -10, right: 0 }}>
              <UserChip user={user} style={{ justifyContent: "flex-end" }} />
            </div>

            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.mintL, color: "#059669", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
              {t("landing.mBadgeWorker")}
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: T.navy, marginBottom: 16, letterSpacing: -1 }}>
              {t("landing.mGreetingHello")}<br />
              <span style={{ background: "linear-gradient(135deg,#0BD8A2,#06B889)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </span>
              {t("landing.mWorkerSuffix")}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: T.ink2, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              {t("landing.mWorkerSub1")}<br />
              {t("landing.mWorkerSub2")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="primary" href="/jobs">{t("landing.workerBtnFind")}</Button>
              <Button variant="secondary" href="/my/applications">{t("landing.workerBtnApplications")}</Button>
            </div>
          </div>
        )}

        {/* Phone Mockup — 8초마다 슬라이드 트랙 (Seeker → Employer → University) */}
        <div style={{ overflow: "hidden", marginTop: 18 }}>
          <div
            style={{
              display: "flex",
              width: "300%",
              transform: `translate3d(${heroIdx * -(100 / 3)}%, 0, 0)`,
              transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
              willChange: "transform",
            }}
          >
            {/* Seeker phone panel */}
            <div
              aria-hidden={!isSeeker}
              style={{
                width: `${100 / 3}%`,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                padding: "0 4px",
                opacity: isSeeker ? 1 : 0.4,
                transition: "opacity 0.6s ease-in-out",
              }}
            >
              <div style={{ width: 240, background: "#B2C7D9", borderRadius: 32, boxShadow: "0 30px 80px rgba(10,22,40,0.14),0 0 0 1px rgba(10,22,40,0.04)", overflow: "hidden", border: "7px solid #1a1a2e" }}>
                <div style={{ width: 80, height: 22, background: "#1a1a2e", borderRadius: "0 0 14px 14px", margin: "0 auto" }} />
                <div style={{ padding: 12, background: "#B2C7D9", minHeight: 460 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", padding: "8px 12px", borderRadius: 10 }}>
                    <KIcon variant="kakao" size="xs" style={{ width: 24, height: 24, fontSize: 12, borderRadius: 7 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.navy }}>K-ALBA 알바 도우미</div>
                      <div style={{ fontSize: 8, color: T.ink3 }}>Linh T. · 🇻🇳 D-2 비자</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: T.mint }} />
                  </div>

                  {/* Bot greeting */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "6px 9px", borderRadius: "3px 10px 10px 10px", fontSize: 9, color: T.navy }}>안녕하세요! 어떤 알바 찾으세요?</div>
                  </div>

                  {/* User reply */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ background: T.kakaoYellowMsg, padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: T.navy, fontWeight: 700 }}>강남 · 주 20시간 🙋</div>
                  </div>

                  {/* Bot recommendation card */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "3px 10px 10px 10px", maxWidth: "85%", width: "85%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, paddingBottom: 5, borderBottom: `1px solid ${T.cream}` }}>
                        <span style={{ fontSize: 11 }}>✨</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>비자에 맞는 알바 <strong>28건</strong></span>
                      </div>
                      {[
                        { ic: "☕", t: "카페 바리스타", m: "강남 · 주 20시간", p: "₩12,000", match: "95%" },
                        { ic: "📚", t: "영어 과외", m: "온라인 · 자유시간", p: "₩25,000", match: "88%" },
                        { ic: "🏨", t: "호텔 프론트", m: "명동 · 주 30시간", p: "₩13,000", match: "78%" },
                      ].map((j, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", borderTop: i > 0 ? `1px solid ${T.cream}` : "none" }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{j.ic}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: T.navy }}>{j.t}</span>
                              <span style={{ fontSize: 7, fontWeight: 700, background: T.mintL, color: "#059669", padding: "1px 4px", borderRadius: 3 }}>{j.match}</span>
                            </div>
                            <div style={{ fontSize: 8, color: T.ink3, marginTop: 1 }}>{j.m}</div>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: T.mint }}>{j.p}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* User select */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ background: T.kakaoYellowMsg, padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: T.navy, fontWeight: 700 }}>카페 바리스타 지원 ✓</div>
                  </div>

                  {/* Bot confirmation */}
                  <div style={{ display: "flex", gap: 5 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "6px 9px", borderRadius: "3px 10px 10px 10px", fontSize: 9, color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>✓</span>
                      <span>지원 완료! 사장님 응답 대기중</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Employer phone panel */}
            <div
              aria-hidden={!isEmployerHero}
              style={{
                width: `${100 / 3}%`,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                padding: "0 4px",
                opacity: isEmployerHero ? 1 : 0.4,
                transition: "opacity 0.6s ease-in-out",
              }}
            >
              <div style={{ width: 240, background: "#B2C7D9", borderRadius: 32, boxShadow: "0 30px 80px rgba(10,22,40,0.14),0 0 0 1px rgba(10,22,40,0.04)", overflow: "hidden", border: "7px solid #1a1a2e" }}>
                <div style={{ width: 80, height: 22, background: "#1a1a2e", borderRadius: "0 0 14px 14px", margin: "0 auto" }} />
                <div style={{ padding: 12, background: "#B2C7D9", minHeight: 460 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", padding: "8px 12px", borderRadius: 10 }}>
                    <KIcon variant="kakao" size="xs" style={{ width: 24, height: 24, fontSize: 12, borderRadius: 7 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.navy }}>K-ALBA 채용 도우미</div>
                      <div style={{ fontSize: 8, color: T.ink3 }}>알비 챗봇 · 실시간 응답</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: T.mint }} />
                  </div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "6px 9px", borderRadius: "3px 10px 10px 10px", fontSize: 9, color: T.navy }}>업종을 선택해 주세요!</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ background: T.kakaoYellowMsg, padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: T.navy, fontWeight: 700 }}>농업 🌾</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "3px 10px 10px 10px", maxWidth: "85%", width: "85%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5, paddingBottom: 5, borderBottom: `1px solid ${T.cream}` }}>
                        <span style={{ fontSize: 10 }}>📍</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>평택 농업 공고 시세</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 8, color: T.ink3 }}>평균</span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: T.coral }}>일급 195,000원</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 8, color: T.ink3 }}>범위</span>
                        <span style={{ fontSize: 8, fontWeight: 600, color: T.ink2 }}>15만~25만원</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "end", gap: 2, height: 18, marginBottom: 3 }}>
                        {[40, 60, 90, 75, 55, 45, 80, 95, 70, 50].map((h, i) => (
                          <div key={i} style={{ flex: 1, height: h + "%", background: i === 7 ? T.coral : T.mint, opacity: 0.7, borderRadius: "2px 2px 0 0" }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 7, color: T.ink3, textAlign: "center" }}>📊 최근 32건 분석</div>
                    </div>
                  </div>

                  <div style={{ background: "#fff", borderRadius: 10, padding: "9px 10px", marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 5, borderBottom: `1px solid ${T.cream}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11 }}>📍</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>근처 외국인 매칭</span>
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: T.coral, padding: "2px 6px", borderRadius: 8 }}>5명</span>
                    </div>
                    {[{ flag: "🇻🇳", name: "Linh T.", dist: "2.1km", rating: "4.8", tag: "D-2" }, { flag: "🇺🇿", name: "Olim K.", dist: "3.5km", rating: "4.9", tag: "E-9" }].map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderTop: i > 0 ? `1px solid ${T.cream}` : "none" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{p.flag}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: T.navy }}>{p.name}</span>
                            <span style={{ fontSize: 7, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "1px 4px", borderRadius: 3 }}>{p.tag}</span>
                          </div>
                          <div style={{ fontSize: 8, color: T.ink3, marginTop: 1 }}>📍 {p.dist} · ⭐ {p.rating}</div>
                        </div>
                        <span style={{ fontSize: 8, padding: "3px 7px", borderRadius: 5, background: T.mintL, color: "#059669", fontWeight: 700 }}>매칭</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fff", borderRadius: 10, padding: "9px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 5, borderBottom: `1px solid ${T.cream}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 11 }}>⭐</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>우수 인력 추천</span>
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#8B5CF6,#6366F1)", padding: "2px 6px", borderRadius: 8 }}>AI 매칭</span>
                    </div>
                    {[{ flag: "🇰🇭", name: "Sokha M.", exp: "농업 6개월", rating: "4.9", badge: "성실" }, { flag: "🇲🇳", name: "Batbold", exp: "딸기수확 3회", rating: "4.8", badge: "경력" }].map((p, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderTop: i > 0 ? `1px solid ${T.cream}` : "none" }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: T.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{p.flag}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: T.navy }}>{p.name}</div>
                          <div style={{ fontSize: 8, color: T.ink3, marginTop: 1 }}>{p.exp} · ⭐ {p.rating}</div>
                        </div>
                        <span style={{ fontSize: 8, padding: "3px 7px", borderRadius: 5, background: "#EEF2FF", color: "#4F46E5", fontWeight: 700 }}>{p.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* University phone panel */}
            <div
              aria-hidden={!isUniversityHero}
              style={{
                width: `${100 / 3}%`,
                flexShrink: 0,
                display: "flex",
                justifyContent: "center",
                padding: "0 4px",
                opacity: isUniversityHero ? 1 : 0.4,
                transition: "opacity 0.6s ease-in-out",
              }}
            >
              <div style={{ width: 240, background: "#B2C7D9", borderRadius: 32, boxShadow: "0 30px 80px rgba(10,22,40,0.14),0 0 0 1px rgba(10,22,40,0.04)", overflow: "hidden", border: "7px solid #1a1a2e" }}>
                <div style={{ width: 80, height: 22, background: "#1a1a2e", borderRadius: "0 0 14px 14px", margin: "0 auto" }} />
                <div style={{ padding: 12, background: "#B2C7D9", minHeight: 460 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", padding: "8px 12px", borderRadius: 10 }}>
                    <KIcon variant="kakao" size="xs" style={{ width: 24, height: 24, fontSize: 12, borderRadius: 7 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T.navy }}>K-ALBA 학교 도우미</div>
                      <div style={{ fontSize: 8, color: T.ink3 }}>김교수 · 한국외대</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: T.mint }} />
                  </div>

                  {/* Bot notification */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "6px 9px", borderRadius: "3px 10px 10px 10px", fontSize: 9, color: T.navy }}>
                      🔔 시간제취업 신청 <strong>5건</strong> 도착!
                    </div>
                  </div>

                  {/* User reply */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ background: T.kakaoYellowMsg, padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: T.navy, fontWeight: 700 }}>첫 번째 신청 확인 🙋</div>
                  </div>

                  {/* Bot student card */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "3px 10px 10px 10px", maxWidth: "85%", width: "85%" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, paddingBottom: 5, borderBottom: `1px solid ${T.cream}` }}>
                        <span style={{ fontSize: 10 }}>📋</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>시간제취업 신청서</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: T.cream, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🇻🇳</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: T.navy }}>Hoa N. · 경영학과</div>
                          <div style={{ fontSize: 8, color: T.ink3, marginTop: 1 }}>출석률 92% · 학점 B+</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 8, color: T.ink3 }}>근무지</span>
                        <span style={{ fontSize: 8, fontWeight: 700, color: T.navy }}>강남 카페 · 주 20시간</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 7 }}>
                        <span style={{ flex: 1, fontSize: 9, fontWeight: 800, color: "#fff", background: "#10B981", padding: "5px 6px", borderRadius: 6, textAlign: "center" }}>✓ 승인</span>
                        <span style={{ flex: 1, fontSize: 9, fontWeight: 800, color: "#fff", background: "#DC2626", padding: "5px 6px", borderRadius: 6, textAlign: "center" }}>반려</span>
                      </div>
                    </div>
                  </div>

                  {/* User approve */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <div style={{ background: T.kakaoYellowMsg, padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: T.navy, fontWeight: 700 }}>승인 ✓</div>
                  </div>

                  {/* Bot stat summary */}
                  <div style={{ display: "flex", gap: 5 }}>
                    <KIcon variant="kakao" size="xxs" style={{ width: 22, height: 22, fontSize: 10, borderRadius: 7 }} />
                    <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "3px 10px 10px 10px", maxWidth: "85%", width: "85%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.navy }}>📊 이번 학기 누적</span>
                        <span style={{ fontSize: 12, fontWeight: 900, color: "#7C3AED" }}>1,284건</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "end", gap: 2, height: 14 }}>
                        {[30, 55, 70, 50, 85, 95, 75, 60].map((h, i) => (
                          <div key={i} style={{ flex: 1, height: `${h}%`, background: "#7C3AED", opacity: 0.75, borderRadius: "2px 2px 0 0" }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div style={{ ...S.section, paddingBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", padding: "14px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
          {[["📊", t("landing.mTrustJobInfo")], ["🌐", t("landing.mTrust7Lang")], ["💬", t("landing.mTrustKakao")]].map(([ic, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: T.ink3 }}>
              <span style={{ fontSize: 14 }}>{ic}</span>{l}
            </div>
          ))}
        </div>
      </div>


      {/* ── AUDIENCE CAROUSEL (clone-based · 진짜 무한 루프 + drag follow) ── */}
      <div style={{ ...S.section, paddingBottom: 32 }}>
        <div style={{ position: "relative" }}>
          {/* Viewport — 양쪽 가장자리 부드러운 마스크로 카드 페이드 */}
          <div
            style={{
              overflow: "hidden",
              borderRadius: 20,
              touchAction: "pan-y",
            }}
            onTouchStart={handleAudienceTouchStart}
            onTouchMove={handleAudienceTouchMove}
            onTouchEnd={handleAudienceTouchEnd}
          >
            {/* Track — flex row, translateX + drag offset */}
            <div
              style={{
                display: "flex",
                width: `${audienceTrackCount * 100}%`,
                transform: `translate3d(calc(${(-audienceSlide * 100) / audienceTrackCount}% + ${audienceDragX}px), 0, 0)`,
                transition: audienceTransition
                  ? "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
                  : "none",
                willChange: "transform",
              }}
              onTransitionEnd={handleAudienceTransitionEnd}
            >
              {[
                { ...AUDIENCE_TABS_M[audienceN - 1], _key: "clone-last" },
                ...AUDIENCE_TABS_M.map((t, i) => ({ ...t, _key: `real-${i}` })),
                { ...AUDIENCE_TABS_M[0], _key: "clone-first" },
              ].map((tab, slotIdx) => {
                const realIdx =
                  slotIdx === 0
                    ? audienceN - 1
                    : slotIdx === audienceTrackCount - 1
                      ? 0
                      : slotIdx - 1;
                const isActive = realIdx === audienceLogicalIdx;
                return (
                  <div
                    key={tab._key}
                    aria-hidden={!isActive}
                    style={{
                      width: `${100 / audienceTrackCount}%`,
                      flexShrink: 0,
                      boxSizing: "border-box",
                      opacity: isActive ? 1 : 0.55,
                      transition: "opacity 0.3s ease-in-out",
                    }}
                  >
                    <div
                      style={{
                        background: tab.gradient,
                        borderRadius: 20,
                        padding: "28px 22px",
                        border: `1.5px solid ${tab.border}`,
                        minHeight: 340,
                        transition: "all 0.3s ease-in-out",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: "#fff",
                          color: tab.accent,
                          padding: "5px 12px",
                          borderRadius: 100,
                          fontSize: 10,
                          fontWeight: 800,
                          marginBottom: 14,
                          transition: "all 0.3s ease-in-out",
                        }}
                      >
                        {tab.icon} {t("landing." + tab.labelKey)}
                      </div>
                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: T.navy,
                          marginBottom: 18,
                          letterSpacing: -0.5,
                          lineHeight: 1.4,
                          whiteSpace: "pre-line",
                          transition: "all 0.3s ease-in-out",
                        }}
                      >
                        {t("landing." + tab.titleKey)}
                      </h3>
                      <ul
                        style={{
                          listStyle: "none",
                          padding: 0,
                          margin: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {tab.itemKeys.map((itemKey) => (
                          <li
                            key={itemKey}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "14px 14px",
                              background: "#fff",
                              border: `1px solid ${T.border}`,
                              borderRadius: 12,
                              transition: "all 0.3s ease-in-out",
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: tab.accent,
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: 800,
                                lineHeight: 1,
                                transition: "background 0.3s ease-in-out",
                              }}
                            >
                              ✓
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: T.navy,
                                lineHeight: 1.55,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {t("landing." + itemKey)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Left arrow — small + translucent so it doesn't block card copy */}
          <button
            type="button"
            aria-label={t("landing.mPrev")}
            onClick={goAudiencePrev}
            style={{
              position: "absolute",
              left: 6,
              top: "50%",
              transform: "translateY(calc(-50% + 3px))",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.7)",
              border: `1px solid rgba(10, 22, 40, 0.08)`,
              boxShadow: "0 2px 6px rgba(10,22,40,0.08)",
              color: T.ink2,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              fontFamily: "inherit",
              cursor: "pointer",
              zIndex: 2,
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            &lt;
          </button>

          {/* Right arrow — small + translucent */}
          <button
            type="button"
            aria-label={t("landing.mNext")}
            onClick={goAudienceNext}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(calc(-50% + 3px))",
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.7)",
              border: `1px solid rgba(10, 22, 40, 0.08)`,
              boxShadow: "0 2px 6px rgba(10,22,40,0.08)",
              color: T.ink2,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              fontFamily: "inherit",
              cursor: "pointer",
              zIndex: 2,
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              transition: "all 0.2s ease-in-out",
            }}
          >
            &gt;
          </button>
        </div>

        {/* Dots indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18 }}>
          {AUDIENCE_TABS_M.map((tab, i) => (
            <button
              key={tab.id}
              type="button"
              aria-label={t("landing.mViewRole", { label: t("landing." + tab.labelKey) })}
              onClick={() => goAudienceTo(i)}
              style={{
                width: i === audienceLogicalIdx ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background:
                  i === audienceLogicalIdx
                    ? AUDIENCE_TABS_M[i].accent
                    : T.borderStrong,
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease-in-out",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS (compact swipe carousel) ── */}
      <div style={{ background: T.cream, padding: "48px 0 56px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px" }}>
          <div style={S.label}>{t("landing.mTestiLabel")}</div>
          <div style={S.title}>{t("landing.mTestiTitle")}</div>
        </div>

        <div
          style={{
            marginTop: 22,
            padding: "0 20px",
            overflow: "hidden",
            touchAction: "pan-y",
          }}
          className="testimonial-viewport"
          onTouchStart={(e) => { testiTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - testiTouchX.current;
            if (Math.abs(dx) > 40) goTestimonial(dx < 0 ? 1 : -1);
          }}
        >
          <div
            ref={testimonialTrackRef}
            style={{
              display: "flex",
              width: `${TESTIMONIALS_M.length * 100}%`,
              transform: `translateX(-${(testimonialIdx * 100) / TESTIMONIALS_M.length}%)`,
              transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {TESTIMONIALS_M.map((tItem) => (
              <div
                key={tItem.name}
                style={{
                  width: `${100 / TESTIMONIALS_M.length}%`,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    padding: "26px 22px",
                    border: `1px solid ${T.border}`,
                    position: "relative",
                    boxShadow: "0 6px 24px rgba(10,22,40,0.05)",
                    maxWidth: 360,
                    margin: "0 auto",
                  }}
                >
                  {/* Stars */}
                  <div
                    style={{
                      color: "#FBBF24",
                      fontSize: 13,
                      letterSpacing: 2,
                      marginBottom: 14,
                    }}
                  >
                    ★★★★★
                  </div>

                  {/* Bold short quote (1-2 lines) */}
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: T.navy,
                      lineHeight: 1.5,
                      letterSpacing: "-0.02em",
                      whiteSpace: "pre-line",
                      marginBottom: 20,
                      minHeight: 78,
                    }}
                  >
                    {t("landing." + tItem.quoteKey)}
                  </div>

                  {/* Author meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: tItem.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      {tItem.flag}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.ink2 }}>
                        {tItem.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>
                        {tItem.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
          {TESTIMONIALS_M.map((tItem, i) => (
            <button
              key={tItem.name}
              type="button"
              aria-label={t("landing.mViewTesti", { n: i + 1 })}
              onClick={() => jumpTestimonial(i)}
              style={{
                width: i === testimonialIdx ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === testimonialIdx ? T.coral : T.borderStrong,
                border: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "32px 20px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "40px 28px", textAlign: "center", border: `1px solid ${T.border}` }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: T.navy, marginBottom: 12, letterSpacing: -0.5, lineHeight: 1.35 }}>
              {t("landing.mCtaTitle1")}<br />
              {t("landing.mCtaTitle2Pre")}<span style={{ color: T.coral }}>K-ALBA</span>{t("landing.mCtaTitle2Post")}
            </h2>
            <p style={{ fontSize: 13, color: T.ink3, marginBottom: 24, lineHeight: 1.75 }}>
              {t("landing.mCtaSub1")}<br />
              {t("landing.mCtaSub2")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <Link href="/login" style={{ width: "100%", display: "block" }}>
                <button
                  style={{
                    width: "100%",
                    background: T.mint,
                    color: "#fff",
                    padding: "13px 20px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: `0 6px 20px ${T.mint}40`,
                    transition: "all 0.25s ease-in-out",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("landing.startAsSeeker")}
                </button>
              </Link>
              <Link href="/login" style={{ width: "100%", display: "block" }}>
                <button
                  style={{
                    width: "100%",
                    background: T.coral,
                    color: "#fff",
                    padding: "13px 20px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: `0 6px 20px ${T.coral}40`,
                    transition: "all 0.25s ease-in-out",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("landing.startAsEmployer")}
                </button>
              </Link>
              <button
                type="button"
                disabled
                aria-label={t("landing.mStartUniAria")}
                style={{
                  width: "100%",
                  background: "#7C3AED",
                  color: "#fff",
                  padding: "13px 20px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 800,
                  border: "none",
                  cursor: "not-allowed",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: 0.55,
                  letterSpacing: "-0.01em",
                  position: "relative",
                }}
              >
                {t("landing.mStartAsUni")}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#7C3AED",
                    background: "#fff",
                    padding: "2px 8px",
                    borderRadius: 6,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("landing.mComingSoon")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 40px" }}>
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 24, textAlign: "center" }}>
          {/* 이용약관 및 개인정보처리방침 */}
          <div style={{ marginBottom: 16 }}>
            <Link
              href="/terms"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.ink2,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              {t("siteFooter.terms")}
            </Link>
            <span style={{ margin: "0 12px", color: T.ink3 }}>|</span>
            <Link
              href="/privacy"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: T.ink2,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              {t("siteFooter.privacy")}
            </Link>
          </div>

          {/* 법적 정보 */}
          <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.8, marginBottom: 8 }}>
            {COMPANY.brandName} | {t("siteFooter.ceo")}: {COMPANY.ceo} | {t("siteFooter.bizNo")}: {COMPANY.businessNumber}
            <br />
            {t("siteFooter.jobInfoNo")}: {COMPANY.jobInfoLicense} | {COMPANY.name}
          </div>
          <div style={{ fontSize: 10, color: T.g500 }}>
            © 2026 {COMPANY.brandName}. All rights reserved.
          </div>
        </div>
      </div>

      {/* 플로팅 카카오톡 버튼 */}
      <KakaoFloatingButton />
    </div>
  );
}
