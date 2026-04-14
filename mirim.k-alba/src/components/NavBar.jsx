"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { getSession, signOut, supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function NavBar() {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!supabase) return;
    getSession().then((session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "student");
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setUserType(session.user.user_metadata?.user_type || "student");
      } else {
        setUser(null);
        setUserType(null);
      }
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (pathname === "/") return null; // 랜딩 페이지에는 네비게이션 숨김

  const seekerLinks = [
    { href: "/jobs", label: t("nav.findJob") },
    { href: "/my-applications", label: t("nav.myApplications") },
    { href: "/my-contracts", label: t("nav.contracts") },
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

  const links = userType === "employer" ? employerLinks : seekerLinks;

  return (
    <nav
      style={{
        background: "#fff",
        borderBottom: `1px solid ${T.g200}`,
        padding: "12px 20px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: `linear-gradient(135deg,${T.coral},#FF8A7A)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: T.navy }}>
            K-<span style={{ color: T.coral }}>ALBA</span>
          </div>
        </Link>

        {user && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                    color: active ? T.coral : T.g700,
                    background: active ? T.coralL : "transparent",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                color: T.g500,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t("nav.logout")}
            </button>
            <div style={{ marginLeft: 4 }}>
              <LanguageSwitcher compact />
            </div>
          </div>
        )}

        {!user && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <LanguageSwitcher compact />
            <Link
              href="/login"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                color: T.g700,
                background: "transparent",
                border: `1.5px solid ${T.g200}`,
              }}
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/signup"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                color: "#fff",
                background: T.coral,
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
