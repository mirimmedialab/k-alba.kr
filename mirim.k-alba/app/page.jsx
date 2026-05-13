"use client";
import { useState, useEffect } from "react";
import { T, COMPANY } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getSession, supabase } from "@/lib/supabase";
import { UserChip } from "@/components/UserChip";
import { Button, KWordmark, PageLoading } from "@/components/ui";

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
export default function LandingPage() {
  const t = useT();
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
            padding: "48px 20px 56px",
            background: T.n9,
            color: T.paper,
            position: "relative",
            overflow: "hidden",
            borderTop: `3px solid ${T.gold}`,
          }}
        >
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* 상단 워드마크 */}
            <div style={{ marginBottom: 32 }}>
              <KWordmark variant="dark" size={22} />
            </div>

            <h1
              style={{
                fontWeight: 800,
                fontSize: "clamp(26px, 6vw, 36px)",
                lineHeight: 1.25,
                letterSpacing: "-0.03em",
                marginBottom: 18,
              }}
            >
              한국 거주 외국인{" "}
              <em style={{ fontStyle: "normal", color: T.gold }}>260만 명</em>
              을 위한<br />
              합법적 알바 플랫폼
            </h1>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "rgba(255,255,255,0.78)",
                marginBottom: 24,
              }}
            >
              비자별 맞춤 공고, 7개 언어 지원, 카카오톡 챗봇으로 3분 만에
              근로계약서까지.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              <Button variant="landingPrimary" href="/signup" size="lg" fullWidth>
                서비스 시작하기 →
              </Button>
              <Button
                variant="landingDark"
                href="/login"
                size="lg"
                fullWidth
                style={{
                  background: "transparent",
                  color: T.paper,
                  border: "1px solid rgba(255,255,255,0.3)",
                }}
              >
                이미 계정이 있어요
              </Button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
                padding: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(232,217,181,0.2)",
                borderRadius: 6,
              }}
            >
              {[
                ["260만", "한국 거주 외국인"],
                ["12+", "대응 비자 유형"],
                ["7", "지원 언어"],
                ["3min", "근로계약 체결"],
              ].map(([num, label]) => (
                <div key={label}>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 800,
                      color: T.gold,
                      letterSpacing: "-0.025em",
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {num}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                    {label}
                  </div>
                </div>
              ))}
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

      {/* ═══════════════════ PROBLEM (크림 배경) ═══════════════════ */}
      <section
        style={{
          padding: "48px 20px",
          background: T.cream,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 26px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 28,
            }}
          >
            기존 플랫폼이 외국인을{" "}
            <span style={{ color: T.accent }}>구조적으로 배제</span>
            하는 3가지 이유
          </h2>

          {/* MECE 3-item (모바일: 세로 쌓기) */}
          <div style={{ borderTop: `2px solid ${T.n9}` }}>
            {[
              ["1", "언어 장벽", "알바몬·알바천국은 한국어 전용. 외국인은 공고 내용도 급여 조건도 계약 조항도 이해하기 어렵습니다.", "73%", "한국어 장벽으로 구직 포기한 유학생 비율"],
              ["2", "비자 불투명성", "D-2, E-9, F-4 등 12가지 비자별로 가능한 업종이 다름. 근로자도 사업주도 법적 적합성을 판단하기 어렵습니다.", "31%", "비자 혼란을 가장 큰 장벽으로 꼽는 외국인 비율"],
              ["3", "계약서 부재", "근로기준법상 서면 계약이 의무이나 대부분 구두 합의로 진행. 분쟁 시 외국인이 불리한 위치에 놓입니다.", "54%", "서면 근로계약 없이 일하는 파트타임 근로자"],
            ].map(([num, title, desc, stat, statLabel]) => (
              <div
                key={num}
                style={{
                  padding: "20px 0",
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    background: T.n9,
                    color: T.gold,
                    fontWeight: 800,
                    fontSize: 14,
                    borderRadius: 4,
                    marginBottom: 10,
                  }}
                >
                  {num}
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    lineHeight: 1.3,
                    marginBottom: 6,
                    color: T.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.65, marginBottom: 12 }}>
                  {desc}
                </p>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: T.accent,
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                  }}
                >
                  {stat}
                </div>
                <div style={{ fontSize: 13, color: T.ink3, marginTop: 4, lineHeight: 1.4 }}>
                  {statLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ WORKER FEATURES ═══════════════════ */}
      <section
        style={{
          padding: "48px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
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
              fontSize: "clamp(20px, 5vw, 26px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 24,
            }}
          >
            한국어를 잘 못해도, 비자가 복잡해도 —{" "}
            <span style={{ color: T.accent }}>안심하고 알바할 수 있습니다</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["🌐", "내 언어로 알바 찾기", "한국어·영어·중국어·베트남어·우즈벡어·몽골어·일본어 7개 언어 지원."],
              ["🛂", "내 비자에 맞는 공고만", "비자 유형 입력하면 합법적으로 일할 수 있는 공고만 자동 필터링."],
              ["📝", "근로계약서 자동 발급", "변호사 검토 완료 양식을 카톡 챗봇으로 3분 만에 서명."],
              ["💰", "최저시급 보장 확인", "시급 10,030원 미달 공고는 경고 표시, 주휴수당 자동 안내."],
              ["💬", "전화 없이 카톡으로", "5단계 카카오톡 챗봇으로 지원부터 합격까지 완료."],
              ["⭐", "K-ALBA 인증 경력", "근무 완료 시 사장님 평가와 함께 경력 자동 적립."],
            ].map(([ic, title, desc]) => (
              <div
                key={title}
                style={{
                  padding: 18,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{ic}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: T.ink,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ EMPLOYER FEATURES (크림 배경) ═══════════════════ */}
      <section
        style={{
          padding: "48px 20px",
          background: T.cream,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
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
              fontSize: "clamp(20px, 5vw, 26px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 24,
            }}
          >
            외국인 채용이 어렵고 복잡했나요?{" "}
            <span style={{ color: T.accent }}>K-ALBA가 다 해드립니다</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["📢", "카카오톡으로 3분 공고 등록", "14단계 챗봇 질문에 답하면 공고 자동 완성."],
              ["🛂", "비자 자동 확인", "지원자의 비자를 자동 검증. 불법 고용 위험 없이 채용."],
              ["📝", "근로계약서 자동 생성", "공고 정보가 계약서에 자동 입력, 법무법인 검토 완료."],
              ["💼", "인력난 해소", "260만 외국인 근로자 풀에 직접 접근."],
              ["🔍", "국세청 인증 사업주", "사업자번호 실시간 검증으로 인증 배지 부여."],
              ["📊", "지역·업종별 시세 안내", "13개 업종 × 지역별 평균 급여 실시간 제공."],
            ].map(([ic, title, desc]) => (
              <div
                key={title}
                style={{
                  padding: 18,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{ic}</div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: T.ink,
                    marginBottom: 4,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ UNIVERSITY FEATURES ═══════════════════ */}
      <section
        style={{
          padding: "48px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              color: "#9333EA",
              background: "#FAE8FF",
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
              fontSize: "clamp(20px, 5vw, 26px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 28,
            }}
          >
            유학생 시간제취업, <em style={{ fontStyle: "normal", color: "#9333EA" }}>이제 사무실 컴퓨터 없이</em>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["⚡", "24시간 내 모바일 처리", "카카오톡으로 신청서 받아 모바일에서 즉시 검토·서명. 학생을 기다리게 하지 않습니다."],
              ["📄", "확인서 자동 생성", "손글씨 서명 한 번이면 PDF 자동 발급. 학교 인장도 디지털로 적용됩니다."],
              ["⚖️", "출입국관리법 자동 준수", "출석률 70% 미만, C학점 미만 학생 자동 차단. 위반 조건을 시스템이 검증합니다."],
              ["🏆", "IEQAS 평가 가점", "유학생 관리 시스템 도입으로 교육국제화역량인증 평가 가산점 확보."],
              ["📊", "실시간 대시보드", "학과별·국가별 시간제취업 신청 현황을 한눈에 파악. 승인·반려 추이 실시간 추적."],
            ].map(([ic, title, desc]) => (
              <div
                key={title}
                style={{
                  padding: 18,
                  background: T.paper,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{ic}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: T.ink,
                        marginBottom: 4,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {title}
                    </div>
                    <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55 }}>
                      {desc}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PROCESS ═══════════════════ */}
      <section
        style={{
          padding: "48px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontWeight: 800,
              fontSize: "clamp(20px, 5vw, 26px)",
              lineHeight: 1.35,
              letterSpacing: "-0.025em",
              color: T.ink,
              marginBottom: 28,
            }}
          >
            <em style={{ fontStyle: "normal", color: T.gold }}>5단계, 평균 3분.</em>{" "}
            카카오톡을 쓸 줄 안다면 누구나
          </h2>

          {/* 모바일: 세로 타임라인 */}
          <div style={{ position: "relative" }}>
            {/* 세로 연결선 */}
            <div
              style={{
                position: "absolute",
                left: 22,
                top: 22,
                bottom: 22,
                width: 2,
                background: T.border,
                zIndex: 0,
              }}
            />
            {[
              ["1", "공고 탐색", "비자·언어 자동 필터"],
              ["2", "챗봇 지원", "5단계 질문 응답"],
              ["3", "사장님 검토", "24시간 내 응답"],
              ["4", "계약 체결", "자동 생성·양측 서명"],
              ["5", "근무 시작", "PDF 보관, 이력 적립"],
            ].map(([num, title, desc]) => (
              <div
                key={num}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  marginBottom: 20,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: T.n9,
                    color: T.gold,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 800,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {num}
                </div>
                <div style={{ flex: 1, paddingTop: 8 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.ink,
                      marginBottom: 2,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.5 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA ═══════════════════ */}
      <section
        style={{
          padding: "56px 20px",
          background: T.n9,
          color: T.paper,
          borderTop: `3px solid ${T.gold}`,
          position: "relative",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
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
        </div>
      </section>

      {/* ═══════════════════ FOOTER (BI v2 신규: 회사 정보 노출) ═══════════════════ */}
      <footer
        style={{
          padding: "32px 20px",
          background: T.paper,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <KWordmark size={18} />
            <span style={{ fontSize: 12, color: T.ink3 }}>
              외국인과 사장님을 잇는 카톡 알바 플랫폼
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 12,
              color: T.ink3,
              marginBottom: 16,
            }}
          >
            <a href="/about" style={{ color: T.ink3, textDecoration: "none" }}>회사 소개</a>
            <a href="/terms" style={{ color: T.ink3, textDecoration: "none" }}>이용약관</a>
            <a href="/privacy" style={{ color: T.ink3, textDecoration: "none" }}>개인정보처리방침</a>
            <a href={`mailto:${COMPANY.email}`} style={{ color: T.ink3, textDecoration: "none" }}>
              문의: {COMPANY.email}
            </a>
          </div>

          {/* BI v2 핵심: 사업자번호 + 신고번호 노출 (사장님 신뢰감) */}
          <div
            style={{
              fontSize: 11,
              color: T.ink3,
              lineHeight: 1.7,
              paddingTop: 16,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <div>
              <strong style={{ color: T.ink2, fontWeight: 700 }}>{COMPANY.name}</strong>
              {" · "}대표: {COMPANY.ceo}
              {" · "}사업자등록번호: {COMPANY.businessNumber}
            </div>
            <div style={{ marginTop: 2 }}>
              직업정보제공사업 신고번호: {COMPANY.jobInfoLicense}
              {" · "}{COMPANY.address}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: T.borderStrong }}>
              © 2026 {COMPANY.brandName}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
