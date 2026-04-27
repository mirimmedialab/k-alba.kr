"use client";
import { useState, useRef, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Inp } from "@/components/UI";
import { signUp, signInWithOAuth } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

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
      setBizError("사업자번호, 대표자명, 개업일자를 모두 입력해주세요.");
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
      if (!data.ok) {
        setBizError(data.error || "인증 실패");
        setBizVerified(false);
      } else if (data.verified) {
        setBizVerified(true);
        setBizStatus(data.status || "정상");
        setBizError("");
      } else {
        setBizVerified(false);
        setBizError(data.reason || "인증 정보가 일치하지 않습니다.");
      }
    } catch (e) {
      setBizError("인증 서버 연결 실패. 잠시 후 다시 시도해주세요.");
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
      return setError("사업자 인증을 먼저 완료해주세요.");
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
      router.push(role === "student" ? "/jobs" : "/my-jobs");
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

  // ──────────────── Step 0: 역할 선택 ────────────────
  if (step === 0) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 56px - 180px)",
          padding: "56px 20px 40px",
          background: T.paper,
        }}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <Link
            href="/"
            style={{ color: T.ink3, fontSize: 13, marginBottom: 28, display: "inline-block" }}
          >
            ← {t("common.back")}
          </Link>

          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 20 }} />
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
            Sign up · 회원가입
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: "-0.025em",
              lineHeight: 1.25,
              marginBottom: 8,
            }}
          >
            {t("auth.signupTitle")}
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            {t("auth.signupSubtitle")}
          </p>

          {[
            ["student", t("auth.asSeeker"), t("auth.asSeekerDesc"), T.gold],
            ["employer", t("auth.asEmployer"), t("auth.asEmployerDesc"), T.accent],
          ].map(([r, ti, de, accent]) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setStep(1);
              }}
              style={{
                width: "100%",
                padding: "22px 20px",
                background: T.paper,
                border: `1px solid ${T.border}`,
                borderLeft: `3px solid ${accent}`,
                borderRadius: 4,
                marginBottom: 12,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = T.n9;
                e.currentTarget.style.borderLeftColor = accent;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.borderLeftColor = accent;
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: T.ink,
                  marginBottom: 4,
                  letterSpacing: "-0.02em",
                }}
              >
                {ti}
              </div>
              <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
                {de}
              </div>
            </button>
          ))}
        </div>
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
        <button
          type="button"
          onClick={() => setStep(0)}
          style={{
            background: "none",
            border: "none",
            color: T.ink3,
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 24,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          ← {t("common.back")}
        </button>

        <div
          style={{
            width: 40,
            height: 3,
            background: role === "student" ? T.gold : T.accent,
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
          {role === "student" ? "For Workers" : "For Employers"} ·{" "}
          {role === "student" ? "외국인 구직자" : "사장님"}
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
          {role === "student" ? t("auth.asSeeker") : t("auth.asEmployer")}
        </h2>

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

        <Inp
          label={t("auth.name")}
          placeholder={t("auth.namePlaceholder")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
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
        <Inp
          label={t("auth.passwordConfirm")}
          type="password"
          placeholder={t("auth.passwordConfirmPlaceholder")}
          value={form.password2}
          onChange={(e) => setForm({ ...form, password2: e.target.value })}
        />

        {/* 사업자 인증 */}
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
                  ? `✓ 사업자 인증 완료 (${bizStatus})`
                  : "사업자 정보 입력 (필수)"}
              </div>
            </div>
            {!bizVerified && (
              <p style={{ fontSize: 12, color: T.ink2, marginBottom: 12, lineHeight: 1.5 }}>
                국세청 데이터로 실시간 인증됩니다. 사업자등록증 그대로 입력해주세요.
              </p>
            )}
            {!bizVerified ? (
              <>
                <input
                  ref={bizNoInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={bizForm.businessNumber}
                  onChange={onBusinessNumberChange}
                  placeholder="사업자등록번호 (예: 119-75-73333)"
                  maxLength={12}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 4,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    marginBottom: 8,
                    boxSizing: "border-box",
                    background: T.paper,
                  }}
                />
                <input
                  type="text"
                  value={bizForm.representativeName}
                  onChange={(e) =>
                    setBizForm({ ...bizForm, representativeName: e.target.value })
                  }
                  placeholder="대표자 성명 (예: 홍길동)"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 4,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    marginBottom: 8,
                    boxSizing: "border-box",
                    background: T.paper,
                  }}
                />
                <input
                  ref={openingInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={bizForm.openingDate}
                  onChange={onOpeningDateChange}
                  placeholder="개업일자 (예: 2012-09-19)"
                  maxLength={10}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 4,
                    border: `1px solid ${T.border}`,
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    marginBottom: 10,
                    boxSizing: "border-box",
                    background: T.paper,
                  }}
                />
                {bizError && (
                  <div
                    style={{
                      padding: 8,
                      background: T.accentBg,
                      color: T.accent,
                      borderRadius: 4,
                      fontSize: 12,
                      marginBottom: 8,
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
                  {bizVerifyLoading ? "국세청 인증 중..." : "사업자번호 인증하기 →"}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 12, color: T.ink, lineHeight: 1.7 }}>
                <div>
                  사업자번호 · <strong>{bizForm.businessNumber}</strong>
                </div>
                <div>
                  대표자 · <strong>{bizForm.representativeName}</strong>
                </div>
                <div>
                  개업일 · <strong>{bizForm.openingDate}</strong>
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
                  다시 입력하기
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
            (필수){" "}
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
              이용약관
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
              개인정보처리방침
            </Link>
            에 동의합니다.
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

        <Btn primary full type="submit" disabled={loading}>
          {loading ? t("auth.signingUp") : t("auth.signupBtn") + " →"}
        </Btn>

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
