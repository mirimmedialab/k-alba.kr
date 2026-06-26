"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { getSession, signOut, supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { KWordmark } from "@/components/ui";
import NotificationBell from "@/components/NotificationBell";
import { NavAuthSkel } from "@/components/Wireframe";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * 네비게이션 바 — McKinsey 에디토리얼 스타일
 * 랜딩 페이지 웹판과 동일한 디자인 언어
 *   - 흰색 반투명 배경 + 네이비 텍스트
 *   - 샤프한 직각 버튼 (radius 4px)
 *   - 진한 네이비 #0A1628 CTA
 *
 * 반응형: 데스크탑(>=1024px)은 가로 네비 그대로.
 *         모바일/앱은 로그인 상태에서 링크가 많아 줄바꿈되므로 → 햄버거 + 우측 드로어.
 *         (언어 전환은 바에 유지, 메뉴 링크·로그아웃은 드로어로)
 */
export default function NavBar() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const isDesktop = useIsDesktop();

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

  // 페이지 이동 시 드로어 닫기
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  // 데스크탑으로 넓어지면 드로어 닫기
  useEffect(() => { if (isDesktop) setMenuOpen(false); }, [isDesktop]);
  // 드로어 열림 동안 본문 스크롤 잠금
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (menuOpen && !isDesktop) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [menuOpen, isDesktop]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    router.push("/");
  };

  // 랜딩 페이지(/)는 자체 히어로가 있으므로 별도 네비 있음
  // 여기선 랜딩에도 navbar 표시 (웹 랜딩과 일관성)
  const onLanding = pathname === "/" || pathname === "/m";

  const seekerLinks = [
    { href: "/jobs", label: t("nav.findJob") },
    { href: "/jobs/map", label: t("nav.map") },
    { href: "/my/favorites", label: t("nav.favorites") },
    { href: "/my/applications", label: t("nav.myApplications") },
    { href: "/my/contracts", label: t("nav.contracts") },
    { href: "/profile", label: t("nav.profile") },
  ];

  const employerLinks = [
    { href: "/jobs/post", label: t("nav.postJob") },
    { href: "/my/jobs", label: t("nav.myJobs") },
    { href: "/my/contracts", label: t("nav.contracts") },
    { href: "/profile", label: t("nav.profile") },
  ];

  // 관리자용 추가 링크
  const isAdmin = user?.user_metadata?.role === "admin" || user?.app_metadata?.role === "admin";

  const links = userType === "employer" ? employerLinks : seekerLinks;
  const finalLinks = isAdmin ? [...links, { href: "/admin", label: t("nav.admin") }] : links;

  // 로고 클릭 시 이동할 경로 (로그인 상태에 따라 분기)
  const logoHref = !user ? "/" : userType === "employer" ? "/my/jobs" : "/jobs";

  const isLinkActive = (href) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  return (
    <>
      <nav
        style={{
          background: onLanding ? "rgba(255,255,255,0.96)" : T.paper,
          backdropFilter: onLanding ? "blur(12px)" : "none",
          borderBottom: `1px solid ${T.border}`,
          padding: "12px 20px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          minHeight: 56,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* 브랜드 로고 — 타이포 기반 (이모지 X) */}
          <Link href={logoHref} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <KWordmark size={30} />
          </Link>

          {/* 랜딩 페이지: 심플하게 언어 + CTA 만 */}
          {onLanding && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LanguageSwitcher compact />
              {authChecked && !user && (
                <Link
                  href="/jobs"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.paper,
                    background: T.n9,
                    padding: "8px 16px",
                    borderRadius: 4,
                    textDecoration: "none",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("nav.getStarted")} →
                </Link>
              )}
              {authChecked && user && (
                <Link
                  href={userType === "employer" ? "/my/jobs" : "/jobs"}
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.paper,
                    background: T.n9,
                    padding: "8px 16px",
                    borderRadius: 4,
                    textDecoration: "none",
                  }}
                >
                  {t("nav.myDashboard")} →
                </Link>
              )}
              {!authChecked && <NavAuthSkel />}
            </div>
          )}

          {/* 랜딩이 아닌 페이지: 전체 네비게이션 */}
          {!onLanding && !authChecked && <NavAuthSkel />}

          {/* 로그인 상태 — 데스크탑: 가로 네비 / 모바일: 언어 + 햄버거 */}
          {!onLanding && authChecked && user && (
            isDesktop ? (
              <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                {finalLinks.map((l) => {
                  const active = isLinkActive(l.href);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 4,
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        textDecoration: "none",
                        color: active ? T.accent : T.ink2,
                        background: "transparent",
                        borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                        marginBottom: -1,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {l.label}
                    </Link>
                  );
                })}
                <button
                  onClick={handleLogout}
                  style={{
                    padding: "8px 12px",
                    fontSize: 14,
                    fontWeight: 500,
                    background: "transparent",
                    color: T.ink3,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginLeft: 4,
                  }}
                >
                  {t("nav.logout")}
                </button>
                <div style={{ marginLeft: 4 }}>
                  <LanguageSwitcher compact />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <LanguageSwitcher compact />
                <button
                  type="button"
                  aria-label={t("nav.menu", null, "메뉴")}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    padding: 0,
                    background: "transparent",
                    border: `1px solid ${T.border}`,
                    borderRadius: 4,
                    color: T.ink,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
              </div>
            )
          )}

          {/* 비로그인 상태 (랜딩 외) — 로그인/회원가입 */}
          {!onLanding && authChecked && !user && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <LanguageSwitcher compact />
              <button
                onClick={() => router.push("/login")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.ink,
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t("nav.login")}
              </button>
              <button
                onClick={() => router.push("/signup")}
                style={{
                  padding: "8px 14px",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.paper,
                  background: T.n9,
                  border: "none",
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t("nav.signup")}
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ===== 모바일 드로어 (로그인 상태에서만) ===== */}
      {menuOpen && !isDesktop && user && (
        <>
          {/* 백드롭 */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10,22,40,0.45)",
              zIndex: 100,
              animation: "kalbaNavFade 0.18s ease",
            }}
          />
          {/* 우측 드로어 */}
          <aside
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "78%",
              maxWidth: 320,
              background: T.paper,
              borderLeft: `1px solid ${T.border}`,
              boxShadow: "-8px 0 28px rgba(10,22,40,0.18)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
              animation: "kalbaNavSlide 0.22s cubic-bezier(0.2,0.7,0.2,1)",
            }}
          >
            {/* 드로어 헤더 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 18px",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <KWordmark size={24} />
              <button
                type="button"
                aria-label={t("common.close", null, "닫기")}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  color: T.ink2,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            {/* 드로어 링크 */}
            <nav style={{ display: "flex", flexDirection: "column", padding: "8px 0", flex: 1, overflowY: "auto" }}>
              {finalLinks.map((l) => {
                const active = isLinkActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      padding: "14px 20px",
                      fontSize: 16,
                      fontWeight: active ? 700 : 500,
                      textDecoration: "none",
                      color: active ? T.accent : T.ink,
                      background: active ? T.accentBg || "transparent" : "transparent",
                      borderLeft: active ? `3px solid ${T.accent}` : "3px solid transparent",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>

            {/* 로그아웃 */}
            <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  background: "transparent",
                  color: T.ink3,
                  border: `1px solid ${T.border}`,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t("nav.logout")}
              </button>
            </div>
          </aside>

          <style>{`
            @keyframes kalbaNavFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes kalbaNavSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
          `}</style>
        </>
      )}
    </>
  );
}
