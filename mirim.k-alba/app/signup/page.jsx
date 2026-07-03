"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, COMPANY } from "@/lib/theme";
import { signUp, signIn, signInWithOAuth } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { authErrorMessage } from "@/lib/authErrors";
import { Button, Input, Select, KWordmark, ButtonLoading } from "@/components/ui";
import KakaoLogo from "@/components/KakaoLogo";
import { VISA_OPTIONS } from "@/data/marketData";
import EmailField, { isValidEmail } from "@/components/ui/EmailField";

/**
 * /signup 회원가입
 *
 * 페르소나 분기:
 *   - worker (구직자): 비자 정보 필수
 *   - employer (사장님): 가입은 이름·이메일·비번·약관만 → 사업자 인증은
 *     가입 후 공고등록/프로필에서 진행(지연 인증). verified 기본 false.
 */

/** 알바생 비자 선택 옵션 (필수 입력 — "비공개" 제외) */
const WORKER_VISA_OPTIONS = VISA_OPTIONS
  .filter((o) => o.v !== "private")
  .map((o) => ({ value: o.v, label: o.l }));

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
    visa: "",
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
  });
  const [error, setError] = useState("");
  const [verifyPending, setVerifyPending] = useState(false); // 가입 후 이메일 인증 대기 화면

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!form.name || !form.email || !form.password) return setError(t("auth.errAllFields"));
    if (!isValidEmail(form.email)) return setError(t("auth.errEmailFormat", null, "올바른 이메일 주소를 입력해 주세요 (예: name@example.com)"));
    if (form.password !== form.password2) return setError(t("auth.errPasswordMatch"));
    if (form.password.length < 8) return setError(t("auth.errPasswordLen"));
    if (role === "worker" && !form.visa) {
      return setError(t("auth.errVisaRequired", null, "비자 종류를 선택해 주세요."));
    }
    if (!form.agreeTerms) return setError(t("auth.errAgreeTerms"));
    if (!form.agreePrivacy) return setError(t("auth.errAgreePrivacy"));

    setLoading(true);
    const nowIso = new Date().toISOString();
    const consent = {
      agreed_terms_at: nowIso,
      agreed_privacy_at: nowIso,
      agreed_marketing_at: form.agreeMarketing ? nowIso : null,
    };
    // 사장님: 사업자 인증은 가입 후 진행(verified 기본 false). 알바생: 비자 저장.
    const extra = role === "employer"
      ? { ...consent }
      : { visa: form.visa, ...consent };

    // 1) 탈퇴(비활성화) 계정 재활성화 대상인지 "먼저" 확인/처리(정책 A).
    //    (이메일 인증이 켜져 있어, 이미 있는 이메일로 signUp하면 에러·인증메일 없이 조용히 넘어가므로 사전 확인 필수)
    try {
      const res = await fetch("/api/account/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          userType: role,
          name: form.name,
          visa: role === "worker" ? form.visa : null,
          consent,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        // 재활성화 완료(이메일 확정 처리됨) → 바로 로그인
        const { error: siErr } = await signIn(form.email, form.password);
        setLoading(false);
        if (siErr) return setError(authErrorMessage(siErr.message, locale));
        router.push(role === "worker" ? "/jobs" : "/my/jobs");
        return;
      }
      if (j?.error === "active") {
        // 이미 가입된(활성) 이메일 → 로그인 안내
        setLoading(false);
        return setError(authErrorMessage("already registered", locale));
      }
      // j.error === "not_found" → 신규 이메일 → 아래 신규 가입 진행
    } catch (_) { /* 네트워크 실패 시 신규 가입 시도 */ }

    // 2) 신규 가입
    const { error } = await signUp(form.email, form.password, role, form.name, extra);
    setLoading(false);
    if (error) {
      setError(authErrorMessage(error.message, locale));
      return;
    }
    // 3) 이메일 인증 필수(Confirm email ON) → 세션 없음 → 인증 안내 화면으로(로그인 유도). /jobs로 보내지 않음.
    setVerifyPending(true);
  };

  const handleSocial = async (provider) => {
    if (!role || (role !== "worker" && role !== "employer")) {
      setError(t("auth.selectTypeFirst"));
      return;
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem("k-alba-oauth-intent", "signup");
      sessionStorage.setItem("k-alba-oauth-role", role);
    }
    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(authErrorMessage(error.message, locale));
      setLoading(false);
    }
  };

  // ──────────────── 가입 후: 이메일 인증 안내 ────────────────
  if (verifyPending) {
    return (
      <div style={{ padding: "40px 20px", position: "relative", minHeight: "70vh" }}>
        {/* 상단 '로그인' 버튼을 가리키는 힌트 */}
        <div style={{ position: "absolute", top: 2, right: 14, display: "flex", alignItems: "center", gap: 6, color: T.accent, fontSize: 13, fontWeight: 800 }}>
          <span>위 ‘로그인’ 버튼</span>
          <span style={{ fontSize: 20, display: "inline-block", animation: "kalbaArrowBounce 1s ease-in-out infinite" }}>↗</span>
        </div>
        <div style={{ maxWidth: 420, margin: "56px auto 0", textAlign: "center" }}>
          <div style={{ fontSize: 46, marginBottom: 16 }}>✉️</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 12 }}>
            이메일을 확인해 주세요<br />
            <span style={{ fontSize: 15, fontWeight: 600, color: T.ink2 }}>Verify your email</span>
          </h1>
          <p style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.8, marginBottom: 10 }}>
            <strong>{form.email}</strong> 로 인증 메일을 보냈어요.<br />
            <span style={{ color: T.ink3 }}>We sent a verification email.</span>
          </p>
          <p style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.8, marginBottom: 28 }}>
            이메일 인증 완료 후 상단 <strong>‘로그인’</strong> 버튼을 눌러 회원가입을 완료해주세요.<br />
            <span style={{ color: T.ink3 }}>After verifying, tap “Login” at the top to finish.</span>
          </p>
          <button
            onClick={() => router.push("/login")}
            style={{ padding: "13px 30px", background: T.n9, color: T.paper, border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            로그인 하러 가기 · Go to login
          </button>
        </div>
        <style>{"@keyframes kalbaArrowBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}"}</style>
      </div>
    );
  }

  // ──────────────── Step 0: 역할 선택 ────────────────
  if (step === 0) {
    return (
      <div style={{ padding: "32px 20px" }}>
            <Link
              href="/"
              style={{ color: T.ink3, fontSize: 13, textDecoration: "none", fontWeight: 600, marginBottom: 32, display: "block" }}
            >
              ← {t("common.back")}
            </Link>

            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", lineHeight: 1.3, marginBottom: 10 }}>
                {t("auth.headline1")}<br />
                <span style={{ color: "#FF6B5A" }}>{t("auth.headlineAccent")}</span>
              </h1>
              <p style={{ color: T.ink2, fontSize: 15, lineHeight: 1.6 }}>
                {t("auth.selectUserType")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {[
                ["worker", "🌏", t("auth.cardSeekerTitle"), t("auth.cardSeekerDesc"), T.gold, "#FFF8E5"],
                ["employer", "💼", t("auth.cardEmployerTitle"), t("auth.cardEmployerDesc"), T.accent, "#FFF3F0"],
                ["university", "🏫", t("auth.cardUniversityTitle"), t("auth.cardUniversityDesc"), "#7C3AED", "#F5F3FF"],
              ].map(([r, icon, title, desc, accentColor, bgColor]) => {
                const isComingSoon = r === "university";
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (isComingSoon) return;
                      setRole(r);
                      setStep(1);
                    }}
                    disabled={isComingSoon}
                    style={{
                      width: "100%",
                      padding: "16px 14px",
                      background: T.paper,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      textAlign: "left",
                      cursor: isComingSoon ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      position: "relative",
                      opacity: isComingSoon ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (isComingSoon) return;
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(10, 22, 40, 0.08)";
                      e.currentTarget.style.borderColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      if (isComingSoon) return;
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = T.border;
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 3, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 6 }}>
                        {title}
                        {isComingSoon && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.ink3, background: T.cream, padding: "2px 6px", borderRadius: 3 }}>
                            {t("auth.comingSoon")}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
                        {desc}
                      </div>
                    </div>
                    {!isComingSoon && (
                      <div style={{ fontSize: 20, color: accentColor, flexShrink: 0 }}>
                        →
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
      </div>
    );
  }

  // ──────────────── Step 1: 폼 입력 ────────────────
  return (
    <div style={{ padding: "32px 20px" }}>
      <form onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={() => setStep(0)}
          style={{ background: "none", border: "none", color: T.ink3, fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit", marginBottom: 32, display: "block", fontWeight: 600 }}
        >
          ← {t("common.back")}
        </button>

        <div style={{ width: 40, height: 3, background: role === "worker" ? T.gold : T.accent, marginBottom: 20 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          {role === "worker" ? t("auth.forWorkers") : t("auth.forEmployers")} ·{" "}
          {role === "worker" ? t("auth.seekerLabel") : t("auth.employerLabel")}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 24 }}>
          {role === "worker" ? t("auth.asSeeker") : t("auth.asEmployer")}
        </h2>

        {/* 소셜 로그인 — 카카오/구글 특수 디자인 보존 */}
        <button
          type="button"
          onClick={() => handleSocial("kakao")}
          disabled={loading}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 4, border: "none", background: "#FEE500", fontSize: 14, fontWeight: 600, color: "#1A1A1A", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}
        >
          <KakaoLogo size={18} /> {t("auth.signupKakao")}
        </button>
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={loading}
          style={{ width: "100%", padding: "13px 16px", borderRadius: 4, border: `1px solid ${T.border}`, background: T.paper, fontSize: 14, fontWeight: 600, color: T.ink, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {t("auth.signupGoogle")}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ fontSize: 12, color: T.ink3 }}>{t("auth.orEmail")}</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <Input
            label={t("auth.name")}
            placeholder={t("auth.namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <EmailField
            label={t("auth.email")}
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            required
          />
          <Input
            label={t("auth.password")}
            type="password"
            placeholder={t("auth.passwordHint")}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            label={t("auth.passwordConfirm")}
            type="password"
            placeholder={t("auth.passwordConfirmPlaceholder")}
            value={form.password2}
            onChange={(e) => setForm({ ...form, password2: e.target.value })}
            required
          />
        </div>

        {/* 비자 정보 — 알바생만 (필수) */}
        {role === "worker" && (
          <div style={{ marginBottom: 16 }}>
            <Select
              label={t("auth.visaLabelRequired", null, "비자 종류 (필수)")}
              required
              options={WORKER_VISA_OPTIONS}
              value={form.visa}
              onChange={(v) => setForm({ ...form, visa: v })}
              placeholder={t("auth.visaSelectPlaceholder", null, "비자 종류를 선택하세요")}
              hint={t("auth.visaWhyNote", null, "비자에 맞는 합법 알바만 안내해 드리기 위해 필요해요.")}
            />
          </div>
        )}

        {/* 약관 동의 (필수 2종 분리 + 선택) */}
        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingBottom: 10, marginBottom: 6, borderBottom: `1px solid ${T.border}` }}>
            <input type="checkbox" checked={form.agreeTerms && form.agreePrivacy && form.agreeMarketing} onChange={(e) => { const v = e.target.checked; setForm({ ...form, agreeTerms: v, agreePrivacy: v, agreeMarketing: v }); }} style={{ width: 16, height: 16, accentColor: T.n9, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{t("auth.agreeAll")}</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "5px 0" }}>
            <input type="checkbox" checked={form.agreeTerms} onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })} style={{ width: 15, height: 15, accentColor: T.n9, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.ink2, flex: 1 }}>{t("auth.agreeTermsRequired")}</span>
            <Link href="/terms" target="_blank" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: T.ink3, textDecoration: "underline", flexShrink: 0 }}>{t("auth.view")}</Link>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "5px 0" }}>
            <input type="checkbox" checked={form.agreePrivacy} onChange={(e) => setForm({ ...form, agreePrivacy: e.target.checked })} style={{ width: 15, height: 15, accentColor: T.n9, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.ink2, flex: 1 }}>{t("auth.agreePrivacyRequired")}</span>
            <Link href="/privacy" target="_blank" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: T.ink3, textDecoration: "underline", flexShrink: 0 }}>{t("auth.view")}</Link>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "5px 0" }}>
            <input type="checkbox" checked={form.agreeMarketing} onChange={(e) => setForm({ ...form, agreeMarketing: e.target.checked })} style={{ width: 15, height: 15, accentColor: T.n9, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: T.ink3, flex: 1 }}>{t("auth.agreeMarketing")}</span>
          </label>
        </div>

        {error && (
          <div style={{ padding: "10px 12px", background: T.accentBg, color: T.accent, borderRadius: 4, fontSize: 13, marginBottom: 12, border: `1px solid ${T.accent}30` }}>
            {error}
          </div>
        )}

        <Button variant="landingPrimary" size="lg" fullWidth type="submit" disabled={loading}>
          {loading ? <ButtonLoading text={t("auth.signingUp")} /> : t("auth.signupBtn") + " →"}
        </Button>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.ink3 }}>
          {t("auth.hasAccount")}{" "}
          <Link href="/login" style={{ color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.ink}` }}>
            {t("auth.loginLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
