"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { getCurrentUser, signOut, supabase } from "@/lib/supabase";
import { PageLoading, Select } from "@/components/ui";
import { VISA_OPTIONS, REGIONS } from "@/data/marketData";

/**
 * /consent — 약관 동의 + (알바생) 비자 입력 게이트
 *
 * 카카오/구글 OAuth 가입자는 가입 폼이 없어 약관 동의를 받지 못한다.
 * 최초 로그인 후 auth/callback 에서 동의 기록이 없으면 이 페이지로 보낸다.
 * (이메일 가입자는 가입 폼에서 이미 동의 → 보통 여기로 오지 않음)
 *
 * 추가: 알바생(worker)은 비자 정보가 필수다. 약관 동의가 끝났더라도
 * 비자가 비어 있으면 이 게이트에서 비자를 받는다. (신규+기존 알바생 모두)
 */

/** 알바생 비자 선택 옵션 (필수 입력 — "비공개" 제외) */
const WORKER_VISA_OPTIONS = VISA_OPTIONS
  .filter((o) => o.v !== "private")
  .map((o) => ({ value: o.v, label: o.l }));

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
  const [visa, setVisa] = useState("");
  const [regions, setRegions] = useState([]);
  const [alreadyConsented, setAlreadyConsented] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("agreed_terms_at, agreed_privacy_at, user_type, visa, regions").eq("id", u.id).maybeSingle();
      if (Array.isArray(prof?.regions) && prof.regions.length) setRegions(prof.regions);
      const isWorker = (prof?.user_type || "worker") !== "employer";
      const hasConsent = !!(prof?.agreed_terms_at && prof?.agreed_privacy_at);
      const hasVisa = !!prof?.visa;
      // 통과 조건: 약관 동의 완료 AND (사장님 이거나 비자 입력 완료)
      if (hasConsent && (!isWorker || hasVisa)) {
        router.replace(nextUrl.startsWith("/") ? nextUrl : (prof.user_type === "employer" ? "/my/jobs" : "/jobs"));
        return;
      }
      setUser({ ...u, user_type: prof?.user_type || "worker" });
      setAlreadyConsented(hasConsent);
      if (prof?.visa) setVisa(prof.visa);
      setChecking(false);
    });
  }, [router, nextUrl]);

  const submit = async () => {
    setErr("");
    const isWorker = (user?.user_type || "worker") !== "employer";
    if (!alreadyConsented) {
      if (!agreeTerms) return setErr(t("auth.errAgreeTerms"));
      if (!agreePrivacy) return setErr(t("auth.errAgreePrivacy"));
    }
    if (isWorker && !visa) {
      return setErr(t("auth.errVisaRequired", null, "비자 종류를 선택해 주세요."));
    }
    if (!user) return;
    setBusy(true);
    const nowIso = new Date().toISOString();
    const updates = {};
    if (!alreadyConsented) {
      updates.agreed_terms_at = nowIso;
      updates.agreed_privacy_at = nowIso;
      updates.agreed_marketing_at = agreeMarketing ? nowIso : null;
    }
    if (isWorker) {
      updates.visa = visa;
      updates.regions = regions; // 관심 지역(선택) — 미선택이면 빈 배열
    }
    const { error } = await supabase
      .from("profiles")
      .update(updates)
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

  const isWorker = (user?.user_type || "worker") !== "employer";
  const onlyVisa = alreadyConsented && isWorker; // 약관은 이미 동의됨, 비자만 필요한 상태

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
          {onlyVisa ? t("auth.visaGateTitle", null, "비자 정보를 입력해 주세요") : t("auth.consentTitle")}
        </h1>
        <p style={{ fontSize: 14, color: T.ink2, lineHeight: 1.6, marginBottom: 24 }}>
          {onlyVisa ? t("auth.visaGateDesc", null, "비자에 맞는 합법 알바를 안내해 드리기 위해 비자 종류가 필요해요.") : t("auth.consentDesc")}
        </p>

        {/* 약관 동의 — 아직 동의하지 않은 경우만 표시 */}
        {!alreadyConsented && (
          <div style={{ background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", paddingBottom: 12, marginBottom: 6, borderBottom: `1px solid ${T.border}` }}>
              <input type="checkbox" checked={allChecked} onChange={(e) => { const v = e.target.checked; setAgreeTerms(v); setAgreePrivacy(v); setAgreeMarketing(v); }} style={{ width: 17, height: 17, accentColor: T.coral, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{t("auth.agreeAll")}</span>
            </label>
            {cbRow(agreeTerms, setAgreeTerms, "auth.agreeTermsRequired", "/terms")}
            {cbRow(agreePrivacy, setAgreePrivacy, "auth.agreePrivacyRequired", "/privacy")}
            {cbRow(agreeMarketing, setAgreeMarketing, "auth.agreeMarketing", null)}
          </div>
        )}

        {/* 비자 정보 — 알바생만 (필수) */}
        {isWorker && (
          <div style={{ marginTop: alreadyConsented ? 0 : 16 }}>
            <Select
              label={t("auth.visaLabelRequired", null, "비자 종류 (필수)")}
              required
              options={WORKER_VISA_OPTIONS}
              value={visa}
              onChange={setVisa}
              placeholder={t("auth.visaSelectPlaceholder", null, "비자 종류를 선택하세요")}
              hint={t("auth.visaWhyNote", null, "비자에 맞는 합법 알바만 안내해 드리기 위해 필요해요.")}
            />
          </div>
        )}

        {/* 관심 지역 — 알바생 (선택). 설정하면 내 지역 공고 알림만 받음 */}
        {isWorker && (
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: T.ink, marginBottom: 4 }}>관심 지역 <span style={{ color: T.ink3, fontWeight: 500 }}>(선택 · 여러 개 가능)</span></label>
            <p style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5, marginBottom: 8 }}>선택하면 내 지역 알바 알림만 받아요. 나중에 프로필에서 바꿀 수 있어요.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REGIONS.map((r) => {
                const on = regions.includes(r);
                return (
                  <button key={r} type="button" onClick={() => setRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
                    style={{ padding: "7px 12px", borderRadius: 20, border: `1.5px solid ${on ? T.coral : T.border}`, background: on ? T.coralL : "#fff", color: on ? T.coralDark : T.ink2, fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>{r}</button>
                );
              })}
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: T.accentBg, color: T.accent, borderRadius: 8, fontSize: 13, border: `1px solid ${T.accent}30` }}>{err}</div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{ width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 10, border: "none", background: busy ? "#FDE68A" : T.coral, color: "#fff", fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer", fontFamily: "inherit" }}
        >
          {busy ? t("common.pleaseWait") : (onlyVisa ? t("auth.visaGateSubmit", null, "저장하고 시작하기") : t("auth.consentSubmit"))}
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
