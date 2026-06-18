"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * 관리자 콘솔 공통 레이아웃 (데스크탑 전용)
 *
 * - 좌측 고정 사이드바 + 우측 콘텐츠 영역
 * - 인증: httpOnly 쿠키(kalba_admin) 유효성을 /api/admin/auth/check 로 확인
 *   (미들웨어 쿠키 존재 확인 + API 쿠키 검증의 이중 가드)
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
  const [state, setState] = useState("loading"); // loading | ok

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/check", { cache: "no-store" });
        if (res.ok) { setState("ok"); return; }
      } catch (_) {}
      router.replace("/login/admin");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try { await fetch("/api/admin/auth/logout", { method: "POST" }); } catch (_) {}
    router.replace("/login/admin");
  };

  if (state === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: T.cream, color: T.ink3 }}>
        불러오는 중…
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
            <img src="/img/k-alba_logo.svg" alt="K-ALBA" style={{ height: 26, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
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
          <button
            onClick={logout}
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
      <main style={{ flex: 1, minWidth: 0, padding: "28px 32px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}
