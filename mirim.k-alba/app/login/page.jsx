"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Inp } from "@/components/UI";
import { signIn, signInWithOAuth } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

/**
 * 로그인 페이지 — McKinsey 에디토리얼 스타일
 *   - 좌측 얇은 골드 라인 (siganture)
 *   - 네이비 #0A1628 primary CTA
 *   - 샤프한 4px radius
 *   - 카카오 노랑은 유지 (브랜드 필수)
 */
export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await signIn(form.email, form.password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      const userType = data?.user?.user_metadata?.user_type || "student";
      router.push(userType === "employer" ? "/my-jobs" : "/jobs");
    }
  };

  const handleSocial = async (provider) => {
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
        minHeight: "calc(100vh - 56px - 180px)", // nav - footer
        padding: "56px 20px 40px",
        background: T.paper,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: 420, margin: "0 auto" }}
      >
        {/* Back link — 서브하게 */}
        <Link
          href="/"
          style={{
            color: T.ink3,
            fontSize: 13,
            marginBottom: 28,
            display: "inline-block",
            letterSpacing: "-0.01em",
          }}
        >
          ← {t("common.back")}
        </Link>

        {/* Editorial 상단 — 골드 라인 + 작은 라벨 */}
        <div
          style={{
            width: 40,
            height: 3,
            background: T.gold,
            marginBottom: 20,
          }}
        />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Account · 로그인
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: T.ink,
            letterSpacing: "-0.025em",
            lineHeight: 1.25,
            marginBottom: 32,
          }}
        >
          {t("auth.loginTitle")}
        </h1>

        {/* 소셜 로그인 */}
        <button
          type="button"
          onClick={() => handleSocial("kakao")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 4,
            border: "none",
            background: "#FEE500",
            fontSize: 14,
            fontWeight: 600,
            color: "#1A1A1A",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span> {t("auth.loginKakao")}
        </button>

        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 4,
            border: `1px solid ${T.border}`,
            background: T.paper,
            fontSize: 14,
            fontWeight: 600,
            color: T.ink,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "-0.01em",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {t("auth.loginGoogle")}
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 12, color: T.ink3, letterSpacing: "-0.01em" }}>
            {t("auth.orEmail")}
          </span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        {/* Email/Password */}
        <Inp
          label={t("auth.email")}
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Inp
          label={t("auth.password")}
          type="password"
          placeholder={t("auth.passwordHint")}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: T.accentBg,
              color: T.accent,
              borderRadius: 4,
              border: `1px solid ${T.accent}30`,
              fontSize: 13,
              marginBottom: 12,
              letterSpacing: "-0.01em",
            }}
          >
            {error}
          </div>
        )}

        <Btn primary full type="submit" disabled={loading}>
          {loading ? t("auth.loggingIn") : t("auth.loginBtn") + " →"}
        </Btn>

        <p
          style={{
            textAlign: "center",
            marginTop: 24,
            fontSize: 13,
            color: T.ink3,
            letterSpacing: "-0.01em",
          }}
        >
          {t("auth.noAccount")}{" "}
          <Link
            href="/signup"
            style={{
              color: T.ink,
              fontWeight: 700,
              borderBottom: `1px solid ${T.ink}`,
              paddingBottom: 1,
            }}
          >
            {t("auth.signupLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
