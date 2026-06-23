"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getCurrentUser, signOut, supabase } from "@/lib/supabase";
import { PageLoading } from "@/components/ui";

/**
 * /consent — 약관 동의 게이트
 *
 * 카카오/구글 OAuth 가입자는 가입 폼이 없어 약관 동의를 받지 못한다.
 * 최초 로그인 후 auth/callback 에서 동의 기록이 없으면 이 페이지로 보낸다.
 * (이메일 가입자는 가입 폼에서 이미 동의 → 여기로 오지 않음)
 */
function ConsentInner() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "";

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      // 이미 동의했으면 통과
      const { data: prof } = await supabase
        .from("profiles").select("agreed_terms_at, agreed_privacy_at, user_type").eq("id", u.id).maybeSingle();
      if (prof?.agreed_terms_at && prof?.agreed_privacy_at) {
        router.replace(nextUrl.startsWith("/") ? nextUrl : (prof.user_type === "employer" ? "/my/jobs" : "/jobs"));
        return;
      }
      setUser({ ...u, user_type: prof?.user_type || "worker" });
      setChecking(false);
    });
  }, [router, nextUrl]);

  const submit = async () => {
    setErr("");
    if (!agreeTerms) return setErr(t("auth.errAgreeTerms"));
    if (!agreePrivacy) return setErr(t("auth.errAgreePrivacy"));
    if (!user) return;
    setBusy(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("profiles")
      .update({
        agreed_terms_at: nowIso,
        agreed_privacy_at: nowIso,
        agreed_marketing_at: agreeMarketing ? nowIso : null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const dest = nextUrl.startsWith("/") ? nextUrl : (user.user_type === "employer" ? "/my/jobs" : "/jobs");
    router.replace(dest);
  };

  if (checking) return <PageLoading message={t("common.pleaseWait")} minHeight={400} />;

  const cbRow = (checked, set, labelKey, href) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "7px 0" }}>
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.coral, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, color: T.ink2, flex: 1 }}>{t(labelKey)}</span>
      {href && (
        <Link href={href} target="_blank" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: T.ink3, textDecoration: "underline", flexShrink: 0 }}>{t("auth.view")}</Link>
      )}
    </label>
  );

  const allChecked = agreeTerms && agreePrivacy && agreeMarketing;

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "48px 16px 64px", minHeight: "70vh" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.35, marginBottom: 8 }}>
          {t("auth.consentTitle")}
        </h1>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 24 }}>{t("auth.consentDesc")}</p>

        <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingBottom: 12, marginBottom: 6, borderBottom: `1px solid ${T.border}` }}>
            <input type="checkbox" checked={allChecked} onChange={(e) => { const v = e.target.checked; setAgreeTerms(v); setAgreePrivacy(v); setAgreeMarketing(v); }} style={{ width: 17, height: 17, accentColor: T.coral, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{t("auth.agreeAll")}</span>
          </label>
          {cbRow(agreeTerms, setAgreeTerms, "auth.agreeTermsRequired", "/terms")}
          {cbRow(agreePrivacy, setAgreePrivacy, "auth.agreePrivacyRequired", "/privacy")}
          {cbRow(agreeMarketing, setAgreeMarketing, "auth.agreeMarketing", null)}
        </div>

        {err && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: T.accentBg, color: T.accent, borderRadius: 8, fontSize: 13, border: `1px solid ${T.accent}30` }}>{err}</div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{ width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "none", background: busy ? "#FDE68A" : T.coral, color: "#fff", fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}
        >
          {busy ? t("common.pleaseWait") : t("auth.consentSubmit")}
        </button>

        <button
          onClick={async () => { await signOut(); router.replace("/login"); }}
          style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 8, border: "none", background: "transparent", color: T.ink3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentInner />
    </Suspense>
  );
}
