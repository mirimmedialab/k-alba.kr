"use client";
import { useState, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, COMPANY } from "@/lib/theme";
import { signUp, signInWithOAuth } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { Button, Input, KWordmark, ButtonLoading } from "@/components/ui";

/**
 * /signup 회원가입 (BI v2)
 *
 * 페르소나 분기 (BI v2 Section 2):
 *   - worker (구직자): T.gold 액센트
 *   - employer (사장님): T.accent 액센트 + 사업자번호 검증
 *
 * 변경점 (BI v2):
 *   - Btn → Button (Step 3-A) — variant="landingPrimary"
 *   - Inp → Input (Step 3-B) — forwardRef로 caret 보존 호환
 *   - 인라인 사업자 인증 input 3개 → Input + size="md"
 *   - 상단 KWordmark 추가
 *   - 로딩 → ButtonLoading (Step 3-B)
 *
 * 보존:
 *   - 사업자번호 자동 포맷팅 (3-2-5) + caret 위치 보존
 *   - 개업일자 자동 포맷팅 (YYYY-MM-DD)
 *   - 국세청 API 연동 (verify-business)
 *   - OAuth 흐름 (sessionStorage role 저장)
 *   - Step 0 (역할 선택) + Step 1 (폼 입력) 2단계 분기
 *   - 카카오/구글 소셜 로그인 버튼 (특수 디자인 유지)
 *   - 다국어 (useT)
 */

/** 사업자등록번호 3-2-5 포맷 */
function formatBusinessNumber(raw) {
  const d = String(raw).replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 개업일자 YYYY-MM-DD 포맷 */
function formatOpeningDate(raw) {
  const d = String(raw).replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password2: "",
    agree: false,
  });
  const [error, setError] = useState("");

  // 사업자 인증
  const [bizForm, setBizForm] = useState({
    businessNumber: "",
    representativeName: "",
    openingDate: "",
  });
  const [bizVerified, setBizVerified] = useState(false);
  const [bizVerifyLoading, setBizVerifyLoading] = useState(false);
  const [bizError, setBizError] = useState("");
  const [bizStatus, setBizStatus] = useState("");

  const bizNoInputRef = useRef(null);
  const openingInputRef = useRef(null);
  const bizCaretRef = useRef(null);
  const openingCaretRef = useRef(null);

  const caretAfterDigits = (formatted, digitsBeforeCaret) => {
    let seen = 0;
    let pos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        seen += 1;
        if (seen >= digitsBeforeCaret) {
          pos = i + 1;
          break;
        }
      }
    }
    return pos;
  };

  useLayoutEffect(() => {
    const p = bizCaretRef.current;
    if (!p) return;
    bizCaretRef.current = null;
    const el = bizNoInputRef.current;
    if (!el || bizForm.businessNumber !== p.formatted) return;
    const pos = caretAfterDigits(p.formatted, p.digits);
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  }, [bizForm.businessNumber]);

  useLayoutEffect(() => {
    const p = openingCaretRef.current;
    if (!p) return;
    openingCaretRef.current = null;
    const el = openingInputRef.current;
    if (!el || bizForm.openingDate !== p.formatted) return;
    const pos = caretAfterDigits(p.formatted, p.digits);
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
  }, [bizForm.openingDate]);

  const onBusinessNumberChange = (e) => {
    const el = e.target;
    const sel = el.selectionStart ?? 0;
    const digitsLeft = el.value.slice(0, sel).replace(/\D/g, "").length;
    const formatted = formatBusinessNumber(el.value);
    bizCaretRef.current = { digits: digitsLeft, formatted };
    setBizForm((prev) => ({ ...prev, businessNumber: formatted }));
  };

  const onOpeningDateChange = (e) => {
    const el = e.target;
    const sel = el.selectionStart ?? 0;
    const digitsLeft = el.value.slice(0, sel).replace(/\D/g, "").length;
    const formatted = formatOpeningDate(el.value);
    openingCaretRef.current = { digits: digitsLeft, formatted };
    setBizForm((prev) => ({ ...prev, openingDate: formatted }));
  };

  const verifyBusiness = async () => {
    setBizError("");
    const bn = bizForm.businessNumber.replace(/-/g, "");
    const od = bizForm.openingDate.replace(/-/g, "");
    if (bn.length !== 10 || !bizForm.representativeName.trim() || od.length !== 8) {
      setBizError(t("auth.bizVerifyAllFields"));
      return;
    }
    setBizVerifyLoading(true);
    try {
      const res = await fetch("/api/verify-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessNumber: bn,
          representativeName: bizForm.representativeName.trim(),
          openingDate: od,
        }),
      });
      const data = await res.json();
      if (data.valid === true) {
        setBizVerified(true);
        setBizStatus(data.status || "정상");
        setBizError("");
      } else {
        setBizVerified(false);
        setBizError(data.error || t("auth.bizVerifyFailed"));
      }
    } catch (e) {
      setBizError(t("auth.bizVerifyServerError"));
      setBizVerified(false);
    } finally {
      setBizVerifyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!form.name || !form.email || !form.password) return setError(t("auth.errAllFields"));
    if (form.password !== form.password2) return setError(t("auth.errPasswordMatch"));
    if (form.password.length < 8) return setError(t("auth.errPasswordLen"));
    if (!form.agree) return setError(t("auth.errAgree"));

    if (role === "employer" && !bizVerified) {
      return setError(t("auth.bizVerifyRequired"));
    }

    setLoading(true);
    const extra = role === "employer" ? {
      business_number: bizForm.businessNumber.replace(/-/g, ""),
      representative_name: bizForm.representativeName,
      opening_date: bizForm.openingDate.replace(/-/g, ""),
      business_verified: true,
    } : {};
    const { error } = await signUp(form.email, form.password, role, form.name, extra);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push(role === "worker" ? "/jobs" : "/my/jobs");
    }
  };

  const handleSocial = async (provider) => {
    // role이 선택되지 않은 상태면 OAuth 차단
    if (!role || (role !== "worker" && role !== "employer")) {
      setError("먼저 가입 유형(구직자 또는 사장님)을 선택해주세요.");
      return;
    }

    // OAuth 콜백에서 user_type 매핑하기 위해 sessionStorage에 저장
    if (typeof window !== "undefined") {
      sessionStorage.setItem("k-alba-oauth-intent", "signup");
      sessionStorage.setItem("k-alba-oauth-role", role);
    }

    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 성공 시 OAuth provider로 redirect되므로 이후 코드 실행 안 됨
  };

  // ──────────────── Step 0: 역할 선택 ────────────────
  if (step === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 180px)",
          background: T.paper,
          padding: "40px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            justifyContent: "center",
          }}
          className="signup-layout"
        >
          {/* 메인 콘텐츠 */}
          <div style={{ width: 440 }} className="main-content">
            {/* 뒤로 + 워드마크 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32,
              }}
            >
              <Link
                href="/"
                style={{ color: T.ink3, fontSize: 13, textDecoration: "none", fontWeight: 600 }}
              >
                ← 뒤로
              </Link>
              <KWordmark size={18} />
            </div>

            {/* 헤드라인 */}
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: T.ink,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}
              >
                외국인 채용과 시간제취업,<br />
                <span style={{ color: "#FF6B5A" }}>더 쉽고 안전하게</span>
              </h1>
              <p style={{ color: T.ink2, fontSize: 15, lineHeight: 1.6 }}>
                사용자 유형을 선택해주세요.
              </p>
            </div>

            {/* 선택 카드 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {[
                [
                  "worker",
                  "🌏",
                  "외국인 구직자",
                  "한국에서 합법적으로 일자리를 찾고 싶어요",
                  T.gold,
                  "#FFF8E5",
                ],
                [
                  "employer",
                  "💼",
                  "사장님",
                  "외국인 직원을 안전하게 채용하고 싶어요",
                  T.accent,
                  "#FFF3F0",
                ],
                [
                  "university",
                  "🏫",
                  "대학 담당자",
                  "유학생 취업·시간제취업 관리를 돕고 싶어요",
                  "#7C3AED",
                  "#F5F3FF",
                ],
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
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        background: bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: T.ink,
                          marginBottom: 3,
                          letterSpacing: "-0.02em",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {title}
                        {isComingSoon && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: T.ink3,
                              background: T.cream,
                              padding: "2px 6px",
                              borderRadius: 3,
                            }}
                          >
                            준비중
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
                        {desc}
                      </div>
                    </div>
                    {!isComingSoon && (
                      <div
                        style={{
                          fontSize: 20,
                          color: accentColor,
                          flexShrink: 0,
                        }}
                      >
                        →
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 카카오톡 채널 */}
            <div
              style={{
                background: T.cream,
                borderRadius: 8,
                padding: "16px",
                border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>카카오톡 채널</div>
              </div>
              <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, marginBottom: 12 }}>
                사장님은 카카오톡 챗봇으로 3분만에 공고 등록 가능
              </p>
              <a
                href="https://pf.kakao.com/_qTxouX"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.paper,
                  background: "#FEE500",
                  padding: "8px 16px",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                채널 열기 →
              </a>
            </div>
          </div>

          {/* 우측 QR 코드 */}
          <div
            style={{
              display: "none",
              textAlign: "center",
              paddingTop: 80,
            }}
            className="qr-section"
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 8,
                background: "#fff",
                padding: 8,
                marginBottom: 8,
                border: `1px solid ${T.border}`,
              }}
            >
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fk-alba.kr&margin=0"
                alt="K-ALBA QR"
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 3 }}>
              K-ALBA
            </div>
            <div style={{ fontSize: 10, color: T.ink2, lineHeight: 1.4 }}>
              휴대폰으로<br />접속하세요
            </div>
          </div>
        </div>

        <style jsx>{`
          @media (min-width: 1024px) {
            .qr-section {
              display: block !important;
            }
          }
          @media (max-width: 1023px) {
            .signup-layout {
              flex-direction: column;
              max-width: 100% !important;
            }
            .main-content {
              width: 100% !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ──────────────── Step 1: 폼 입력 ────────────────
  return (
    <div
      style={{
        minHeight: "calc(100vh - 56px - 180px)",
        padding: "40px 20px",
        background: T.paper,
      }}
    >
      <form onSubmit={handleSubmit} style={{ maxWidth: 460, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => setStep(0)}
            style={{
              background: "none",
              border: "none",
              color: T.ink3,
              fontSize: 13,
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            ← {t("common.back")}
          </button>
          <KWordmark size={16} />
        </div>

        <div
          style={{
            width: 40,
            height: 3,
            background: role === "worker" ? T.gold : T.accent,
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
          {role === "worker" ? t("auth.forWorkers") : t("auth.forEmployers")} ·{" "}
          {role === "worker" ? t("auth.seekerLabel") : t("auth.employerLabel")}
        </div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: T.ink,
            letterSpacing: "-0.025em",
            marginBottom: 24,
          }}
        >
          {role === "worker" ? t("auth.asSeeker") : t("auth.asEmployer")}
        </h2>

        {/* 소셜 로그인 — 카카오/구글 특수 디자인 보존 */}
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
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span> {t("auth.signupKakao")}
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
          }}
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

        {/* Step 3-B Input 컴포넌트 적용 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <Input
            label={t("auth.name")}
            placeholder={t("auth.namePlaceholder")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label={t("auth.email")}
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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

        {/* 사업자 인증 — 사장님만 */}
        {role === "employer" && (
          <div
            style={{
              padding: 16,
              background: bizVerified ? "#F0F7F2" : T.cream,
              border: `1px solid ${bizVerified ? T.green : T.border}`,
              borderLeft: `3px solid ${bizVerified ? T.green : T.gold}`,
              borderRadius: 4,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: bizVerified ? T.green : T.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                {bizVerified
                  ? `✓ ${t("auth.bizVerified")} (${bizStatus})`
                  : t("auth.bizInfoRequired")}
              </div>
            </div>
            {!bizVerified && (
              <p style={{ fontSize: 12, color: T.ink2, marginBottom: 12, lineHeight: 1.5 }}>
                {t("auth.bizVerifyDesc")}
              </p>
            )}
            {!bizVerified ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Input
                  ref={bizNoInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={bizForm.businessNumber}
                  onChange={onBusinessNumberChange}
                  placeholder={t("auth.bizNumberPlaceholder")}
                  maxLength={12}
                  variant="compact"
                  size="sm"
                />
                <Input
                  type="text"
                  value={bizForm.representativeName}
                  onChange={(e) =>
                    setBizForm({ ...bizForm, representativeName: e.target.value })
                  }
                  placeholder={t("auth.bizRepNamePlaceholder")}
                  variant="compact"
                  size="sm"
                />
                <Input
                  ref={openingInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={bizForm.openingDate}
                  onChange={onOpeningDateChange}
                  placeholder={t("auth.bizOpeningDatePlaceholder")}
                  maxLength={10}
                  variant="compact"
                  size="sm"
                />
                {bizError && (
                  <div
                    style={{
                      padding: 8,
                      background: T.accentBg,
                      color: T.accent,
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  >
                    {bizError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={verifyBusiness}
                  disabled={bizVerifyLoading}
                  style={{
                    width: "100%",
                    padding: 11,
                    borderRadius: 4,
                    border: "none",
                    background: T.n9,
                    color: T.paper,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: bizVerifyLoading ? "wait" : "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {bizVerifyLoading ? (
                    <ButtonLoading text={t("auth.bizVerifying")} />
                  ) : (
                    t("auth.bizVerifyBtn")
                  )}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
                <div>
                  {t("auth.bizNumber")} · <strong>{bizForm.businessNumber}</strong>
                </div>
                <div>
                  {t("auth.bizRepName")} · <strong>{bizForm.representativeName}</strong>
                </div>
                <div>
                  {t("auth.bizOpeningDate")} · <strong>{bizForm.openingDate}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBizVerified(false);
                    setBizStatus("");
                  }}
                  style={{
                    marginTop: 8,
                    background: "none",
                    border: "none",
                    color: T.ink3,
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                >
                  {t("auth.bizReenter")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 약관 동의 */}
        <label
          style={{
            padding: "12px 14px",
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            marginBottom: 16,
            display: "flex",
            alignItems: "start",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={form.agree}
            onChange={(e) => setForm({ ...form, agree: e.target.checked })}
            style={{ marginTop: 3, accentColor: T.n9, width: 15, height: 15, flexShrink: 0 }}
          />
          <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.6 }}>
            {t("auth.termsRequired")}{" "}
            <Link
              href="/terms"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: T.ink,
                fontWeight: 600,
                borderBottom: `1px solid ${T.ink}`,
              }}
            >
              {t("auth.termsOfService")}
            </Link>
            {" 및 "}
            <Link
              href="/privacy"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              style={{
                color: T.ink,
                fontWeight: 600,
                borderBottom: `1px solid ${T.ink}`,
              }}
            >
              {t("auth.privacyPolicy")}
            </Link>
            {t("auth.termsAgreeSuffix")}
          </div>
        </label>

        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: T.accentBg,
              color: T.accent,
              borderRadius: 4,
              fontSize: 13,
              marginBottom: 12,
              border: `1px solid ${T.accent}30`,
            }}
          >
            {error}
          </div>
        )}

        {/* 가입 버튼 — Step 3-A Button (landingPrimary 골드) */}
        <Button
          variant="landingPrimary"
          size="lg"
          fullWidth
          type="submit"
          disabled={loading}
        >
          {loading ? <ButtonLoading text={t("auth.signingUp")} /> : t("auth.signupBtn") + " →"}
        </Button>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 13,
            color: T.ink3,
          }}
        >
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            style={{ color: T.ink, fontWeight: 700, borderBottom: `1px solid ${T.ink}` }}
          >
            {t("auth.loginLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
