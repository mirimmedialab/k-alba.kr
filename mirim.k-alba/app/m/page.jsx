"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getSession, supabase } from "@/lib/supabase";
import { UserChip } from "@/components/UserChip";

/**
 * 모바일 랜딩 페이지
 *
 * - 캡처본과 동일한 코랄/민트 디자인 유지 (이전 K-ALBA 모바일 랜딩 그대로 이식)
 * - 색상은 inline 상수 M으로 직접 정의 — 현재 새 McKinsey 테마와 충돌 없음
 * - 데스크톱 사용자가 메인 "서비스 시작하기" 클릭 시에도 이 페이지로 진입
 *   (DesktopMobileFrame이 가운데 480px + 좌우 QR로 감싸 보여줌)
 *
 * 모든 CTA 링크는 /login으로 (사장님/구직자 로그인 페이지)
 */

// ── 모바일 랜딩 전용 색상 (원본 K-ALBA 코랄/민트 디자인 유지)
const M = {
  coral: "#FF6B5A",
  coralL: "#FFF0EE",
  mint: "#0BD8A2",
  mintL: "#E8FFF7",
  navy: "#1A1F3D",
  cream: "#FFFDFB",
  g100: "#F5F3F0",
  g200: "#EDEAE6",
  g300: "#D4D0CA",
  g500: "#8A8580",
  g700: "#4A4640",
};

// ── 모바일 랜딩 전용 Btn (M 색상 사용)
function MBtn({ children, primary, style }) {
  const base = {
    background: primary ? M.coral : "#fff",
    color: primary ? "#fff" : M.navy,
    border: primary ? "none" : `1.5px solid ${M.g200}`,
    padding: "12px 24px",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
    ...style,
  };
  return <button style={base}>{children}</button>;
}

export default function MobileLandingPage() {
  const S = {
    section: { maxWidth: 600, margin: "0 auto", padding: "0 20px" },
    label: { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2.5, marginBottom: 10, color: M.mint },
    title: { fontSize: 28, fontWeight: 900, color: M.navy, marginBottom: 10, letterSpacing: -0.5 },
    desc: { fontSize: 14, color: M.g500, lineHeight: 1.8, marginBottom: 36 },
  };

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setHeroIdx((p) => 1 - p), 8000);
    return () => clearInterval(id);
  }, []);
  const isSeeker = heroIdx === 0;

  // 로딩 중
  if (!authChecked) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", background: M.cream }}>
        <div style={{ fontSize: 14, color: M.g500 }}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      {/* heroFade 키프레임 */}
      <style>{`
        @keyframes heroFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ ...S.section, paddingTop: 32, paddingBottom: 32 }}>
        {!user ? (
          // 비로그인 상태 - 기존 교차 애니메이션 유지
          <div key={heroIdx} style={{ textAlign: "center", marginBottom: 28, animation: "heroFade 1.4s ease-out" }}>
            {isSeeker ? (
              <>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: M.mintL, color: "#059669", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                  🌏 외국인 구직자를 위한
                </div>
                <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: M.navy, marginBottom: 16, letterSpacing: -1 }}>
                  한국에서 일하는 외국인을 위한<br />
                  <span style={{ background: "linear-gradient(135deg,#0BD8A2,#06B889)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    맞춤형 알바
                  </span>
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: M.g700, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                  유학생, 결혼이민자, 취업비자, 워킹홀리데이까지. 비자 유형에 맞는 합법적인 일자리를 다국어로 찾아보세요.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/login"><MBtn primary>알바 찾기 — 무료 가입</MBtn></Link>
                  <Link href="/login"><MBtn>이미 계정이 있어요</MBtn></Link>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FEE500", color: "#3C1E1E", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
                  💼 사장님을 위한
                </div>
                <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: M.navy, marginBottom: 16, letterSpacing: -1 }}>
                  카카오톡 챗봇으로<br />
                  <span style={{ background: `linear-gradient(135deg,${M.coral},#FF8A7A)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    3분만에 공고 완성
                  </span>
                </h1>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: M.g700, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
                  지역·업종별 현재 시세를 분석해 적정 급여까지 추천! 비자 자동 확인으로 안전하게 외국인 채용하세요.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/login">
                    <button style={{ background: M.coral, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 16px ${M.coral}40` }}>
                      공고 등록 — 무료 가입
                    </button>
                  </Link>
                  <Link href="/login"><MBtn>이미 계정이 있어요</MBtn></Link>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
              {[0, 1].map((i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  style={{
                    width: i === heroIdx ? 24 : 8, height: 8, borderRadius: 4,
                    background: i === heroIdx ? (i === 0 ? M.mint : M.coral) : M.g300,
                    border: "none", cursor: "pointer", transition: "all 0.3s",
                  }}
                />
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: M.g500 }}>
              🌏 외국인 구직자 · 💼 사장님 <span style={{ color: M.mint, fontWeight: 700 }}>모두 무료</span>
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FEE500", color: "#3C1E1E", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
              💼 사장님
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: M.navy, marginBottom: 16, letterSpacing: -1 }}>
              안녕하세요,<br />
              <span style={{ background: `linear-gradient(135deg,${M.coral},#FF8A7A)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </span>{" "}
              사장님!
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: M.g700, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              외국인 채용이 필요하신가요?<br />
              카카오톡 챗봇으로 3분만에 공고를 완성하세요.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/my/jobs">
                <button style={{ background: M.coral, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 800, border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 16px ${M.coral}40` }}>
                  💼 내 공고 관리 →
                </button>
              </Link>
              <Link href="/jobs/post"><MBtn>📢 새 공고 등록</MBtn></Link>
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
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: M.mintL, color: "#059669", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
              🌏 외국인 구직자
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25, color: M.navy, marginBottom: 16, letterSpacing: -1 }}>
              안녕하세요,<br />
              <span style={{ background: "linear-gradient(135deg,#0BD8A2,#06B889)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {user.user_metadata?.name || user.email?.split("@")[0]}
              </span>
              님!
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: M.g700, marginBottom: 24, maxWidth: 420, margin: "0 auto 24px" }}>
              당신에게 맞는 새로운 알바를 찾아보세요.<br />
              비자 유형에 맞는 합법적인 일자리만 추천합니다.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/jobs"><MBtn primary>🔍 알바 찾기 →</MBtn></Link>
              <Link href="/my/applications"><MBtn>📋 내 지원 내역</MBtn></Link>
            </div>
          </div>
        )}

        {/* Phone Mockup - 구직자 ↔ 사장님 교차 */}
        <div key={"phone-" + heroIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, animation: "heroFade 1.4s ease-out" }}>
          <div style={{ width: 240, background: isSeeker ? "#fff" : "#B2C7D9", borderRadius: 32, boxShadow: "0 30px 80px rgba(26,31,61,0.14),0 0 0 1px rgba(26,31,61,0.04)", overflow: "hidden", border: "7px solid #1a1a2e", transition: "background 0.4s" }}>
            <div style={{ width: 80, height: 22, background: "#1a1a2e", borderRadius: "0 0 14px 14px", margin: "0 auto" }} />

            {isSeeker ? (
              <div style={{ padding: 12, minHeight: 460 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", padding: "8px 12px", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg,${M.coral},#FF8A7A)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 10 }}>K</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: M.navy }}>K-<span style={{ color: M.coral }}>ALBA</span></div>
                    <div style={{ fontSize: 8, color: M.g500 }}>Linh T. · 🇻🇳 D-2 비자</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: M.mint }} />
                </div>
                <div style={{ background: M.g100, borderRadius: 10, padding: "7px 12px", fontSize: 10, color: M.g500, marginBottom: 8 }}>🔍 알바 검색...</div>
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                  {[{ l: "D-2 가능", active: true }, { l: "강남", active: false }, { l: "주 20시간", active: false }, { l: "한국어 초급", active: false }].map((c, i) => (
                    <span key={i} style={{ fontSize: 8, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: c.active ? M.mintL : "#fff", color: c.active ? "#059669" : M.g500, border: `1px solid ${c.active ? M.mint + "40" : M.g200}` }}>{c.l}</span>
                  ))}
                </div>
                <div style={{ background: `linear-gradient(135deg,${M.mintL},#D1FAE5)`, borderRadius: 8, padding: "6px 10px", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11 }}>✨</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#059669" }}>비자에 맞는 알바 <strong>28건</strong> 찾음!</span>
                </div>
                {[
                  { ic: "☕", t: "카페 바리스타", m: "강남구 · 주 20시간", p: "₩12,000", v: "D-2", bg: "#FFF7ED", match: "95%" },
                  { ic: "📚", t: "영어 과외", m: "온라인 · 자유시간", p: "₩25,000", v: "F-2", bg: "#EEF2FF", match: "88%" },
                  { ic: "🏭", t: "공장 생산직", m: "수원 · 주 40시간", p: "₩12,500", v: "E-9", bg: "#ECFDF5", match: "82%" },
                  { ic: "🏨", t: "호텔 프론트", m: "명동 · 주 30시간", p: "₩13,000", v: "H-1", bg: "#FEF2F2", match: "78%" },
                ].map((j, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: `1px solid ${M.g200}`, marginBottom: 5, background: "#fff" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: j.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{j.ic}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: M.navy }}>{j.t}</span>
                        <span style={{ fontSize: 7, fontWeight: 700, background: M.mintL, color: "#059669", padding: "1px 4px", borderRadius: 3 }}>{j.match}</span>
                      </div>
                      <div style={{ fontSize: 8, color: M.g500, marginTop: 1 }}>{j.m}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: M.mint }}>{j.p}</div>
                      <span style={{ fontSize: 7, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "1px 5px", borderRadius: 3 }}>{j.v} ✓</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 12, background: "#B2C7D9", minHeight: 460 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: "#fff", padding: "8px 12px", borderRadius: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>💬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: M.navy }}>K-ALBA 채용 도우미</div>
                    <div style={{ fontSize: 8, color: M.g500 }}>AI 챗봇 · 실시간 응답</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: M.mint }} />
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>K</div>
                  <div style={{ background: "#fff", padding: "6px 9px", borderRadius: "3px 10px 10px 10px", fontSize: 9, color: M.navy }}>업종을 선택해 주세요!</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <div style={{ background: "#FFEB33", padding: "6px 9px", borderRadius: "10px 3px 10px 10px", fontSize: 9, color: M.navy, fontWeight: 700 }}>농업 🌾</div>
                </div>
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>K</div>
                  <div style={{ background: "#fff", padding: "8px 10px", borderRadius: "3px 10px 10px 10px", maxWidth: "85%", width: "85%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5, paddingBottom: 5, borderBottom: `1px solid ${M.g100}` }}>
                      <span style={{ fontSize: 10 }}>📍</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: M.navy }}>평택 농업 공고 시세</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 8, color: M.g500 }}>평균</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: M.coral }}>일급 195,000원</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 8, color: M.g500 }}>범위</span>
                      <span style={{ fontSize: 8, fontWeight: 600, color: M.g700 }}>15만~25만원</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "end", gap: 2, height: 18, marginBottom: 3 }}>
                      {[40, 60, 90, 75, 55, 45, 80, 95, 70, 50].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: h + "%", background: i === 7 ? M.coral : M.mint, opacity: 0.7, borderRadius: "2px 2px 0 0" }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 7, color: M.g500, textAlign: "center" }}>📊 최근 32건 분석</div>
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 10, padding: "9px 10px", marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 5, borderBottom: `1px solid ${M.g100}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11 }}>📍</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: M.navy }}>근처 외국인 매칭</span>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: M.coral, padding: "2px 6px", borderRadius: 8 }}>5명</span>
                  </div>
                  {[{ flag: "🇻🇳", name: "Linh T.", dist: "2.1km", rating: "4.8", tag: "D-2" }, { flag: "🇺🇿", name: "Olim K.", dist: "3.5km", rating: "4.9", tag: "E-9" }].map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderTop: i > 0 ? `1px solid ${M.g100}` : "none" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: M.g100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{p.flag}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: M.navy }}>{p.name}</span>
                          <span style={{ fontSize: 7, fontWeight: 700, background: "#EEF2FF", color: "#4F46E5", padding: "1px 4px", borderRadius: 3 }}>{p.tag}</span>
                        </div>
                        <div style={{ fontSize: 8, color: M.g500, marginTop: 1 }}>📍 {p.dist} · ⭐ {p.rating}</div>
                      </div>
                      <span style={{ fontSize: 8, padding: "3px 7px", borderRadius: 5, background: M.mintL, color: "#059669", fontWeight: 700 }}>매칭</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#fff", borderRadius: 10, padding: "9px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, paddingBottom: 5, borderBottom: `1px solid ${M.g100}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11 }}>⭐</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: M.navy }}>우수 인력 추천</span>
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#8B5CF6,#6366F1)", padding: "2px 6px", borderRadius: 8 }}>AI 매칭</span>
                  </div>
                  {[{ flag: "🇰🇭", name: "Sokha M.", exp: "농업 6개월", rating: "4.9", badge: "성실" }, { flag: "🇲🇳", name: "Batbold", exp: "딸기수확 3회", rating: "4.8", badge: "경력" }].map((p, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderTop: i > 0 ? `1px solid ${M.g100}` : "none" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: M.mintL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>{p.flag}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: M.navy }}>{p.name}</div>
                        <div style={{ fontSize: 8, color: M.g500, marginTop: 1 }}>{p.exp} · ⭐ {p.rating}</div>
                      </div>
                      <span style={{ fontSize: 8, padding: "3px 7px", borderRadius: 5, background: "#EEF2FF", color: "#4F46E5", fontWeight: 700 }}>{p.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {isSeeker ? (
              <>
                <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(26,31,61,0.06)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${M.g200}` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: M.coral }}>2,340+</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: M.g700 }}>건의 알바</span>
                </div>
                <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(26,31,61,0.06)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${M.g200}` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: M.mint }}>25,000+</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: M.g700 }}>가입 외국인</span>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(26,31,61,0.06)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${M.g200}` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: M.coral }}>1,200+</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: M.g700 }}>외국인 구인기업</span>
                </div>
                <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 4px 16px rgba(26,31,61,0.06)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${M.g200}` }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: M.mint }}>3분</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: M.g700 }}>공고 등록</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── TRUST BAR ── */}
      <div style={{ ...S.section, paddingBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap", padding: "14px 0", borderTop: `1px solid ${M.g200}`, borderBottom: `1px solid ${M.g200}` }}>
          {[["🏛️", "유료직업소개사업"], ["📊", "직업정보제공사업"], ["🛡️", "구직자 보호"], ["🌐", "7개 언어"]].map(([ic, l]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: M.g500 }}>
              <span style={{ fontSize: 14 }}>{ic}</span>{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ ...S.section, paddingBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[["2,340+", "등록 알바"], ["25,000+", "가입 외국인"], ["1,200+", "외국인 구인기업"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center", padding: "20px 8px", background: "#fff", borderRadius: 16, border: `1px solid ${M.g200}` }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: M.navy }}>{n}</div>
              <div style={{ fontSize: 10, color: M.g500, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 구직자: 한국 서류 ── */}
      <div style={{ ...S.section, paddingBottom: 28 }}>
        <div style={{ background: "linear-gradient(135deg,#EEF2FF,#E0E7FF)", borderRadius: 20, padding: "28px 22px", border: "1.5px solid #C7D2FE" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#4F46E5", padding: "5px 12px", borderRadius: 100, fontSize: 10, fontWeight: 800, marginBottom: 12 }}>🌏 외국인 구직자</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: M.navy, marginBottom: 8, letterSpacing: -0.5 }}>한국 서류가<br />어렵지 않으세요?</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: M.g700, marginBottom: 18 }}>근로계약서 자동 작성부터 하이코리아 체류자격외활동허가 서류까지. 복잡한 한국어 서류를 7개 언어로 안내하고 자동으로 생성해 드립니다.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["📝", "근로계약서", "7개 언어 자동 작성", "#EEF2FF"],
              ["🏛️", "하이코리아 서류", "체류자격외활동허가", "#F5F3FF"],
              ["🌐", "7개 언어", "한·영·중·베·우즈벡·몽골·일", "#FFF7ED"],
              ["💬", "한국어 필터", "내 실력에 맞는 알바만", "#FEF2F2"],
            ].map(([ic, ti, de, bg]) => (
              <div key={ti} style={{ background: "#fff", borderRadius: 12, padding: "14px 12px", border: `1px solid ${M.g200}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>{ic}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: M.navy, marginBottom: 3 }}>{ti}</div>
                <div style={{ fontSize: 10, color: M.g500, lineHeight: 1.5 }}>{de}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 사장님: 안전 채용 ── */}
      <div style={{ ...S.section, paddingBottom: 28 }}>
        <div style={{ background: `linear-gradient(135deg,${M.coralL},#FFE4E0)`, borderRadius: 20, padding: "28px 22px", border: `1.5px solid ${M.coral}25` }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: M.coral, padding: "5px 12px", borderRadius: 100, fontSize: 10, fontWeight: 800, marginBottom: 12 }}>💼 사장님</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: M.navy, marginBottom: 8, letterSpacing: -0.5 }}>외국인 채용이<br />처음이어도 안전하게</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: M.g700, marginBottom: 18 }}>비자를 자동으로 확인해 합법 취업 가능자만 지원할 수 있고, 평가·출석률 기반 검증된 우수 알바생을 추천해 드립니다.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["🛂", "비자 자동 확인", "합법 취업자만 지원", "#FEF2F2"],
              ["⭐", "우수 알바생 추천", "평가·출석률 기반", "#FFF7ED"],
              ["📄", "다국어 계약서", "외국인용 자동 발급", "#FFFBEB"],
              ["📊", "지원자 관리", "비교·승인·채팅", "#FFF1F2"],
            ].map(([ic, ti, de, bg]) => (
              <div key={ti} style={{ background: "#fff", borderRadius: 12, padding: "14px 12px", border: `1px solid ${M.g200}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>{ic}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: M.navy, marginBottom: 3 }}>{ti}</div>
                <div style={{ fontSize: 10, color: M.g500, lineHeight: 1.5 }}>{de}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 구직자: 한국 경력 인증 ── */}
      <div style={{ ...S.section, paddingBottom: 40 }}>
        <div style={{ background: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", borderRadius: 20, padding: "28px 22px", border: "1.5px solid #DDD6FE" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#7C3AED", padding: "5px 12px", borderRadius: 100, fontSize: 10, fontWeight: 800, marginBottom: 12 }}>🌏 외국인 구직자</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: M.navy, marginBottom: 8, letterSpacing: -0.5 }}>한국 경력도<br />자동으로 쌓여요</h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: M.g700, marginBottom: 16 }}>K-ALBA를 통해 근무한 경력은 사장님 평가와 함께 자동으로 프로필에 기록됩니다. 다음 알바 지원 시 <strong>인증된 한국 경력</strong>으로 바로 증명!</p>
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: `1.5px solid ${M.mint}30`, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: M.mintL, color: "#059669" }}>✓ K-ALBA 인증</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: M.navy }}>카페 바리스타</span>
            </div>
            <div style={{ fontSize: 11, color: M.g500, marginBottom: 8 }}>블루보틀 강남점 · 2025.09~2026.02 (6개월)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 700 }}>⭐ 4.8</span>
              <span style={{ fontSize: 11, color: M.g500 }}>사장님 평가</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["성실", "시간 준수", "친절"].map((tg) => (
                <span key={tg} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#EEF2FF", color: "#4F46E5" }}>{tg}</span>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: M.g500, lineHeight: 1.6, textAlign: "center" }}>✨ 인증된 고용주 + 이용 후기 + 평가 기반 신뢰 시스템</p>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div style={{ background: M.cream, padding: "48px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={S.label}>이용 후기</div>
          <div style={S.title}>실제 사용자들의 이야기</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {[
              ["★★★★★", "D-2 비자로 할 수 있는 알바를 찾기 힘들었는데, K-ALBA에서 비자 필터로 바로 찾았어요. 서울대 근처 카페에서 일주일 만에 합격!", "🇻🇳", "Linh T.", "베트남 · 서울대 유학생", "#EEF2FF"],
              ["★★★★★", "카카오톡 챗봇으로 딱 3분만에 공고 등록했어요. 평택 농업 시세가 일급 19만5천원이라고 알려줘서 적정 가격도 바로 알 수 있었어요!", "🇰🇷", "박영호", "평택 딸기농장 대표", "#FFFBEB"],
              ["★★★★★", "결혼이민자로 한국에 온 지 3년인데, 한국어 실력에 맞는 알바를 쉽게 찾았어요. 근로계약서 자동 작성이 정말 편해요!", "🇰🇭", "Sokha M.", "캄보디아 · F-6 결혼이민", "#FFF7ED"],
              ["★★★★★", "외국인 채용이 처음이라 막막했는데, 업종별 맞춤 예시가 있어서 그대로 올렸더니 바로 지원자가 왔어요. 비자 확인도 자동이라 안심!", "🇰🇷", "김민수", "이태원 음식점 대표", "#ECFDF5"],
            ].map(([stars, text, flag, name, role, bg]) => (
              <div key={name} style={{ background: "#fff", borderRadius: 18, padding: "24px 20px", border: `1px solid ${M.g200}` }}>
                <div style={{ color: "#FBBF24", fontSize: 14, marginBottom: 12, letterSpacing: 2 }}>{stars}</div>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: M.g700, marginBottom: 16 }}>{text}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{flag}</div>
                  <div><div style={{ fontSize: 13, fontWeight: 800, color: M.navy }}>{name}</div><div style={{ fontSize: 11, color: M.g500 }}>{role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ padding: "32px 20px 20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "40px 28px", textAlign: "center", border: `1px solid ${M.g200}` }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: M.navy, marginBottom: 10, letterSpacing: -0.5 }}>지금 바로 시작하세요</h2>
            <p style={{ fontSize: 13, color: M.g500, marginBottom: 24, lineHeight: 1.7 }}>무료 가입 · 2분 완료 · 카카오톡·Google 로그인</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <button style={{ background: M.mint, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  🌏 구직자로 시작
                </button>
              </Link>
              <Link href="/login">
                <button style={{ background: M.coral, color: "#fff", padding: "12px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  💼 사장님으로 시작
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 40px" }}>
        <div style={{ borderTop: `1px solid ${M.g200}`, paddingTop: 24, textAlign: "center" }}>
          {/* 법적 정보 */}
          <div style={{ fontSize: 11, color: M.g500, lineHeight: 1.8, marginBottom: 10 }}>
            K-ALBA | 대표: 남기환 | 사업자등록번호: 119-86-61402<br />
            직업정보제공사업 신고번호: J1204020260002 | 미림미디어랩 주식회사
          </div>
          <div style={{ fontSize: 10, color: M.g300 }}>© 2026 K-ALBA. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
