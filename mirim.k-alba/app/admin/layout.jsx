"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser, signOut } from "@/lib/supabase";

/**
 * 관리자 콘솔 공통 레이아웃 (데스크탑 전용)
 *
 * - 좌측 고정 사이드바 + 우측 콘텐츠 영역
 * - role=admin 인증 게이트 (미들웨어 + RLS에 더한 클라이언트 가드)
 * - AppFrame에서 /admin 은 폰 프레임/네비/푸터를 제외하므로 풀폭으로 렌더된다.
 */

const NAV = [
  { href: "/admin", label: "대시보드", icon: "▦", exact: true },
  { href: "/admin/users", label: "회원 관리", icon: "◍" },
  { href: "/admin/jobs", label: "공고 관리", icon: "▤" },
  { href: "/admin/applications", label: "지원·매칭", icon: "⇄" },
  { href: "/admin/monitoring", label: "운영 모니터링", icon: "◈" },
  { href: "/admin/campaigns", label: "이메일 캠페인", icon: "✉" },
  { href: "/admin/sync", label: "데이터 동기화", icon: "↻" },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState("loading"); // loading | ok | denied
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) { router.push("/login?redirect=/admin"); return; }
      const role = user.user_metadata?.role || user.app_metadata?.role;
      if (role !== "admin") { setState("denied"); return; }
      setEmail(user.email || "");
      setState("ok");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.cream, color: T.ink3 }}>
        불러오는 중…
      </div>
    );
  }
  if (state === "denied") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.cream }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.ink }}>접근 권한이 없습니다</div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 6 }}>관리자(role=admin) 계정만 접근할 수 있습니다.</div>
          <Link href="/" style={{ display: "inline-block", marginTop: 16, color: T.coral, fontWeight: 700 }}>← 홈으로</Link>
        </div>
      </div>
    );
  }

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: T.cream }}>
      {/* 사이드바 */}
      <aside
        style={{
          width: 240,
          flexShrink: 0,
          background: T.navy,
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "22px 22px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: T.coral }}>K</span>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.3 }}>ALBA Admin</span>
          </div>
          <div style={{ fontSize: 11, color: "#7E8DA8", marginTop: 4 }}>관리자 콘솔</div>
        </div>

        <nav style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#fff" : "#AEBACE",
                  background: active ? "rgba(255,107,90,0.18)" : "transparent",
                  borderLeft: active ? `3px solid ${T.coral}` : "3px solid transparent",
                  textDecoration: "none",
                }}
              >
                <span style={{ width: 18, textAlign: "center", color: active ? T.coral : "#7E8DA8" }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 12, color: "#AEBACE", marginBottom: 8, wordBreak: "break-all" }}>{email}</div>
          <button
            onClick={async () => { await signOut(); router.push("/"); }}
            style={{
              width: "100%", fontSize: 13, fontWeight: 700, padding: "8px 0",
              borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)",
              background: "transparent", color: "#fff", cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 콘텐츠 */}
      <main style={{ flex: 1, minWidth: 0, padding: "28px 32px", maxWidth: 1400 }}>{children}</main>
    </div>
  );
}
