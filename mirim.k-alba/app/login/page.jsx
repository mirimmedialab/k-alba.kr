"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Inp } from "@/components/UI";
import { signIn, signInWithOAuth, isAccountDeactivated, signOut, supabase } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { authErrorMessage } from "@/lib/authErrors";
import KakaoLogo from "@/components/KakaoLogo";
import AppleLogo from "@/components/AppleLogo";

// Apple 로그인 노출 여부 — Supabase Apple provider 설정 완료 후 Vercel 환경변수
// NEXT_PUBLIC_APPLE_LOGIN_ENABLED=1 로 켠다 (설정 전엔 버튼 숨김)
const APPLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_APPLE_LOGIN_ENABLED === "1";
import EmailField, { isValidEmail } from "@/components/ui/EmailField";

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
  const { locale } = useLocale();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // 인증 에러 원본(언어 변경 시 렌더에서 재번역되도록 raw로 보관)
  const [authErrRaw, setAuthErrRaw] = useState("");
  // 회원이 아닌 경우 → 회원가입 바로가기 노출
  const [notMember, setNotMember] = useState(false);
  // 어드민(/admin)으로 redirect되어 온 경우: 소셜 로그인만 노출
  const [adminLogin, setAdminLogin] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAuthErrRaw("");
    setNotMember(false);
    if (!isValidEmail(form.email)) {
      setError(t("auth.errEmailFormat", null, "올바른 이메일 주소를 입력해 주세요 (예: name@example.com)"));
      return;
    }
    setLoading(true);
    const { data, error } = await signIn(form.email, form.password);
    if (error) {
      // 미가입 이메일이면 "회원이 아닙니다" + 회원가입 유도
      let handled = false;
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const j = await res.json();
        if (j?.ok && j.exists === false) {
          setError("회원이 아닙니다. 입력하신 이메일로 가입된 계정이 없어요.");
          setNotMember(true);
          handled = true;
        }
      } catch (e) { /* 확인 실패 시 기본 에러 표시 */ }
      setLoading(false);
      if (!handled) setAuthErrRaw(error.message);
      return;
    }
    // 탈퇴(비활성화)된 계정 차단
    if (data?.user && (await isAccountDeactivated(data.user.id))) {
      await signOut();
      setLoading(false);
      setError("회원이 아닙니다. 탈퇴했거나 가입되지 않은 계정이에요.");
      setNotMember(true);
      return;
    }
    const userType = data?.user?.user_metadata?.user_type || "worker";
    // 알바생: 약관 동의/비자 미입력 시 /consent 게이트로 (기존 알바생 커버)
    if (userType !== "employer" && data?.user?.id && supabase) {
      const { data: prof } = await supabase
        .from("profiles").select("agreed_terms_at, agreed_privacy_at, visa").eq("id", data.user.id).maybeSingle();
      if (!prof?.agreed_terms_at || !prof?.agreed_privacy_at || !prof?.visa) {
        setLoading(false);
        router.push(`/consent?next=${encodeURIComponent("/jobs")}`);
        return;
      }
    }
    setLoading(false);
    router.push(userType === "employer" ? "/my/jobs" : "/jobs");
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason") === "deactivated") {
        setError("회원이 아닙니다. 탈퇴했거나 가입되지 않은 계정이에요.");
        setNotMember(true);
      }
      if (params.get("reason") === "resignup") {
        setError("재가입이 완료되었어요. 방금 설정한 비밀번호로 로그인해 주세요.");
      }
      const rd = params.get("redirect") || "";
      if (rd === "/admin" || rd.startsWith("/admin/")) {
        setAdminLogin(true);
        router.replace("/login/admin"); // 관리자 전용 로그인(풀스크린)으로 이동
      }
    }
  }, []);

  const handleSocial = async (provider) => {
    // 로그인 흐름임을 콜백에 알림
    if (typeof window !== "undefined") {
      sessionStorage.setItem("k-alba-oauth-intent", "login");
      sessionStorage.removeItem("k-alba-oauth-role");
    }

    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setAuthErrRaw(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 20px" }}>
      <form onSubmit={handleSubmit}>
        {/* Back link */}
        <Link
          href="/"
          style={{
            color: T.ink3,
            fontSize: 13,
            marginBottom: 32,
            display: "inline-block",
            letterSpacing: "-0.01em",
            fontWeight: 600,
          }}
        >
          ← {t("common.back")}
        </Link>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: T.ink,
            letterSpacing: "-0.025em",
            lineHeight: 1.3,
            marginBottom: 28,
            textAlign: "center",
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
          <KakaoLogo size={18} /> {t("auth.loginKakao")}
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

        {APPLE_LOGIN_ENABLED && (
        <button
          type="button"
          onClick={() => handleSocial("apple")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 4,
            border: "none",
            background: "#000000",
            fontSize: 14,
            fontWeight: 600,
            color: "#FFFFFF",
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
            letterSpacing: "-0.01em",
          }}
        >
          <AppleLogo size={17} /> {t("auth.loginApple")}
        </button>
        )}

        {/* Divider + Email/Password (어드민 로그인 화면에서는 숨김) */}
        {!adminLogin && (
          <>
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

            <div style={{ marginBottom: 14 }}>
              <EmailField
                label={t("auth.email")}
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
            </div>
            <Inp
              label={t("auth.password")}
              type="password"
              placeholder={t("auth.passwordHint")}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </>
        )}

        {(authErrRaw || error) && (
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
            {authErrRaw ? authErrorMessage(authErrRaw, locale) : error}
            {notMember && (
              <Link
                href="/signup"
                style={{
                  display: "block",
                  marginTop: 10,
                  padding: "12px 14px",
                  background: T.ink,
                  color: "#fff",
                  borderRadius: 4,
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  letterSpacing: "-0.01em",
                }}
              >
                회원가입 하러 가기 →
              </Link>
            )}
          </div>
        )}

        {!adminLogin && (
          <>
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
                marginBottom: 32,
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
          </>
        )}
      </form>
    </div>
  );
}
