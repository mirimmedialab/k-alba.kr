"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import BrandLogo from "@/components/BrandLogo";
import { signInWithOAuth } from "@/lib/supabase";

/**
 * /login/admin — 관리자 전용 로그인
 *
 * - 네비게이션 바·폰 프레임·푸터·카카오버튼 없이 풀스크린 중앙 정렬
 *   (AppFrame에서 "/login/admin" 경로를 프레임/네비 제외 목록에 추가)
 * - 소셜 로그인(카카오/구글)만 노출. 로그인 후 /admin 으로 이동(콜백에서 처리).
 */
export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSocial = async (provider) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("k-alba-oauth-intent", "login");
      sessionStorage.removeItem("k-alba-oauth-role");
      sessionStorage.setItem("k-alba-post-login", "/admin"); // 로그인 후 이동 경로
    }
    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: T.cream,
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        {/* 로고 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <BrandLogo size={30} />
        </div>

        {/* 타이틀 */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: T.ink,
            letterSpacing: "-0.025em",
            marginBottom: 6,
          }}
        >
          로그인
        </h1>
        <p style={{ fontSize: 13, color: T.ink3, marginBottom: 28 }}>관리자 콘솔</p>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: T.accentBg,
              color: T.accent,
              borderRadius: 8,
              border: `1px solid ${T.accent}30`,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* 카카오 */}
        <button
          type="button"
          onClick={() => handleSocial("kakao")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 8,
            border: "none",
            background: "#FEE500",
            fontSize: 14,
            fontWeight: 600,
            color: "#1A1A1A",
            cursor: loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span> 카카오톡으로 로그인
        </button>

        {/* 구글 */}
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.paper,
            fontSize: 14,
            fontWeight: 600,
            color: T.ink,
            cursor: loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Google로 로그인
        </button>
      </div>
    </div>
  );
}
