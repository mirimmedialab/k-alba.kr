"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { Btn, Card, Inp } from "@/components/UI";
import { signUp, signInWithOAuth } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

export default function SignupPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", password2: "", agree: false });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!form.name || !form.email || !form.password) return setError(t("auth.errAllFields"));
    if (form.password !== form.password2) return setError(t("auth.errPasswordMatch"));
    if (form.password.length < 8) return setError(t("auth.errPasswordLen"));
    if (!form.agree) return setError(t("auth.errAgree"));
    setLoading(true);
    const { error } = await signUp(form.email, form.password, role, form.name);
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

  if (step === 0) {
    return (
      <div style={{ padding: "32px 20px", maxWidth: 440, margin: "0 auto" }}>
        <Link href="/" style={{ color: T.g500, fontSize: 14, marginBottom: 24, display: "inline-block" }}>← {t("common.back")}</Link>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginBottom: 8 }}>{t("auth.signupTitle")}</h2>
        <p style={{ color: T.g500, fontSize: 14, marginBottom: 32 }}>{t("auth.signupSubtitle")}</p>
        {[
          ["student", "🌏", t("auth.asSeeker"), t("auth.asSeekerDesc")],
          ["employer", "💼", t("auth.asEmployer"), t("auth.asEmployerDesc")],
        ].map(([r, ic, ti, de]) => (
          <Card key={r} onClick={() => { setRole(r); setStep(1); }} style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 32 }}>{ic}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.navy }}>{ti}</div>
              <div style={{ fontSize: 13, color: T.g500 }}>{de}</div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: "32px 20px", maxWidth: 440, margin: "0 auto" }}>
      <button type="button" onClick={() => setStep(0)} style={{ background: "none", border: "none", color: T.g500, fontSize: 14, cursor: "pointer", marginBottom: 24 }}>← {t("common.back")}</button>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: T.navy, marginBottom: 8 }}>
        {role === "student" ? `🌏 ${t("auth.asSeeker")}` : `💼 ${t("auth.asEmployer")}`}
      </h2>

      <button type="button" onClick={() => handleSocial("kakao")} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: "#FEE500", fontSize: 15, fontWeight: 700, color: "#3C1E1E", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10, marginTop: 20 }}>
        <span style={{ fontSize: 20 }}>💬</span> {t("auth.signupKakao")}
      </button>
      <button type="button" onClick={() => handleSocial("google")} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: `1.5px solid ${T.g200}`, background: "#fff", fontSize: 15, fontWeight: 700, color: T.navy, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        {t("auth.signupGoogle")}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: T.g200 }} />
        <span style={{ fontSize: 12, color: T.g500 }}>{t("auth.orEmail")}</span>
        <div style={{ flex: 1, height: 1, background: T.g200 }} />
      </div>

      <Inp label={t("auth.name")} placeholder={t("auth.namePlaceholder")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Inp label={t("auth.email")} type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Inp label={t("auth.password")} type="password" placeholder={t("auth.passwordHint")} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <Inp label={t("auth.passwordConfirm")} type="password" placeholder={t("auth.passwordConfirmPlaceholder")} value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} />

      <label style={{ padding: "14px 16px", background: T.g100, borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} style={{ marginTop: 3, accentColor: T.mint, width: 16, height: 16, flexShrink: 0 }} />
        <div style={{ fontSize: 12, color: T.g500, lineHeight: 1.6 }}>
          (필수){" "}
          <Link
            href="/terms"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            style={{ color: T.coral, fontWeight: 700, textDecoration: "underline" }}
          >
            이용약관
          </Link>
          {" 및 "}
          <Link
            href="/privacy"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            style={{ color: T.coral, fontWeight: 700, textDecoration: "underline" }}
          >
            개인정보처리방침
          </Link>
          에 동의합니다.
        </div>
      </label>

      {error && <div style={{ padding: 12, background: "#FEE2E2", color: "#DC2626", borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <Btn primary full type="submit" disabled={loading}>{loading ? t("auth.signingUp") : t("auth.signupBtn")}</Btn>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: T.g500 }}>
        {t("auth.hasAccount")} <Link href="/login" style={{ color: T.coral, fontWeight: 700 }}>{t("auth.loginLink")}</Link>
      </p>
    </form>
  );
}
