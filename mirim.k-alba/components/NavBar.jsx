"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { getSession, signOut, supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import { NavAuthSkel } from "@/components/Wireframe";

/**
 * 네비게이션 바 — McKinsey 에디토리얼 스타일
 * 랜딩 페이지 웹판과 동일한 디자인 언어
 *   - 흰색 반투명 배경 + 네이비 텍스트
 *   - 샤프한 직각 버튼 (radius 4px)
 *   - 진한 네이비 #0A1628 CTA
 */
export default function NavBar() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      return;
    }
    getSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "student");
      }
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "student");
      } else {
        setUser(null);
        setUserType(null);
      }
      setAuthChecked(true);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  // 랜딩 페이지(/)는 자체 히어로가 있으므로 별도 네비 있음
  // 여기선 랜딩에도 navbar 표시 (웹 랜딩과 일관성)
  const onLanding = pathname === "/";

  const seekerLinks = [
    { href: "/jobs", label: t("nav.findJob") },
    { href: "/jobs/map", label: "🗺️ 지도" },
    { href: "/my-applications", label: t("nav.myApplications") },
    { href: "/my-contracts", label: t("nav.contracts") },
    { href: "/partwork", label: "🎓 시간제취업" },
    { href: "/chat", label: t("nav.chat") },
    { href: "/profile", label: t("nav.profile") },
  ];

  const employerLinks = [
    { href: "/post-job", label: t("nav.postJob") },
    { href: "/my-jobs", label: t("nav.myJobs") },
    { href: "/my-contracts", label: t("nav.contracts") },
    { href: "/chat", label: t("nav.chat") },
    { href: "/profile", label: t("nav.employerProfile") },
  ];

  // 관리자용 추가 링크
  const isAdmin = user?.user_metadata?.role === "admin" || user?.app_metadata?.role === "admin";

  const links = userType === "employer" ? employerLinks : seekerLinks;
  const finalLinks = isAdmin ? [...links, { href: "/admin", label: "⚙️ 관리자" }] : links;

  return (
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
        <Link
          href="/"
          style={{
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: "-0.02em",
            color: T.n9,
          }}
        >
          K‑ALBA
        </Link>

        {/* 랜딩 페이지: 심플하게 언어 + CTA 만 */}
        {onLanding && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LanguageSwitcher compact />
            {authChecked && !user && (
              <Link
                href="/signup"
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
                시작하기 →
              </Link>
            )}
            {authChecked && user && (
              <Link
                href={userType === "employer" ? "/my-jobs" : "/jobs"}
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
                내 대시보드 →
              </Link>
            )}
            {!authChecked && <NavAuthSkel />}
          </div>
        )}

        {/* 랜딩이 아닌 페이지: 전체 네비게이션 */}
        {!onLanding && !authChecked && <NavAuthSkel />}

        {!onLanding && authChecked && user && (
          <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            {finalLinks.map((l) => {
              const active =
                pathname === l.href ||
                (pathname?.startsWith(l.href + "/") ?? false);
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
            <div style={{ marginLeft: 4 }}>
              <NotificationBell />
            </div>
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
        )}

        {!onLanding && authChecked && !user && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LanguageSwitcher compact />
            <Link
              href="/login"
              style={{
                padding: "8px 14px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                color: T.ink,
                background: "transparent",
                border: `1px solid ${T.border}`,
                letterSpacing: "-0.01em",
              }}
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/signup"
              style={{
                padding: "8px 14px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                color: T.paper,
                background: T.n9,
                letterSpacing: "-0.01em",
              }}
            >
              {t("nav.signup")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
