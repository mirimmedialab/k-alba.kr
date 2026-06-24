"use client";
import { useState } from "react";
import { T, L, TYPE } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/**
 * BusinessVerify — 사업자(국세청) 인증 공용 컴포넌트
 *
 * 인증 흐름: 입력 → "사업자번호 인증하기" → 국세청 NTS 진위확인(/api/verify-business)
 *   - 일치(valid) & 계속사업자 → profiles {business_number, verified:true} 저장 →
 *     "✓ 사업자 인증이 완료되었습니다" 성공 화면 → "계속하기" 클릭 시 onVerified 호출
 *   - 불일치/휴폐업/오류 → 입력 폼 위에 사유 메시지 표시(재시도 가능)
 *
 * @param {string} userId 현재 사용자 id (profiles.id)
 * @param {(info:{business_number:string,status:string})=>void} [onVerified]
 * @param {boolean} [showPrompt=true]
 */

function formatBusinessNumber(raw) {
  const d = String(raw).replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

function formatOpeningDate(raw) {
  const d = String(raw).replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export default function BusinessVerify({ userId, onVerified, showPrompt = true }) {
  const t = useT();
  const [businessNumber, setBusinessNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // 인증 성공 정보 {business_number, status, taxType}

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: TYPE.family,
    border: `1px solid ${T.borderStrong}`,
    borderRadius: L.rMd,
    outline: "none",
    color: T.ink,
    background: T.paper,
    boxSizing: "border-box",
  };

  const verify = async () => {
    setError("");
    const bn = businessNumber.replace(/-/g, "");
    const od = openingDate.replace(/-/g, "");
    if (bn.length !== 10 || !representativeName.trim() || od.length !== 8) {
      setError(t("auth.bizVerifyAllFields", null, "사업자등록번호·대표자명·개업일자를 모두 정확히 입력해 주세요."));
      return;
    }
    setLoading(true);
    try {
      // 로그인 토큰을 함께 보내 서버가 verified 를 저장하게 한다(RLS/세션 타이밍 무관, 확실히 저장).
      let token = "";
      try { const { data: s } = await supabase.auth.getSession(); token = s?.session?.access_token || ""; } catch (_) {}
      const res = await fetch("/api/verify-business", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ businessNumber: bn, representativeName: representativeName.trim(), openingDate: od }),
      });
      const data = await res.json();
      if (data.valid === true) {
        // 서버가 저장하지 못한 경우(토큰 없음 등)에 한해 클라이언트로 보강
        if (!data.persisted && supabase && userId) {
          try { await supabase.from("profiles").update({ business_number: bn, verified: true }).eq("id", userId); } catch (_) {}
        }
        setLoading(false);
        setDone({ business_number: bn, status: data.status || t("auth.bizStatusNormal", null, "정상"), taxType: data.taxType || "" });
      } else {
        setLoading(false);
        // 국세청이 돌려준 사유 우선, 없으면 친절한 기본 문구
        setError(data.error || t("auth.bizMismatch", null, "입력하신 정보가 국세청 자료와 일치하지 않아요. 사업자등록증에 적힌 내용 그대로 다시 확인해 주세요."));
      }
    } catch (e) {
      setLoading(false);
      setError(t("auth.bizVerifyServerError", null, "인증 서버 오류예요. 잠시 후 다시 시도해 주세요."));
    }
  };

  // ── 성공 확인 화면 ──
  if (done) {
    return (
      <div style={{ padding: 16, background: "#F0F7F2", border: `1px solid ${T.green}`, borderLeft: `3px solid ${T.green}`, borderRadius: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.green, marginBottom: 8 }}>
          {t("auth.bizVerifiedTitle", null, "✓ 사업자 인증이 완료되었습니다")}
        </div>
        <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.8, marginBottom: 14 }}>
          <div>{t("auth.bizNumber", null, "사업자등록번호")} · <strong style={{ color: T.ink }}>{done.business_number}</strong></div>
          <div>{t("profile.verificationStatus", null, "상태")} · <strong style={{ color: T.ink }}>{done.status}</strong>{done.taxType ? ` · ${done.taxType}` : ""}</div>
        </div>
        <button
          type="button"
          onClick={() => onVerified?.(done)}
          style={{ width: "100%", padding: 12, borderRadius: 6, border: "none", background: T.green, color: T.paper, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: TYPE.family, letterSpacing: "-0.01em" }}
        >
          {t("auth.bizContinue", null, "계속하기 →")}
        </button>
      </div>
    );
  }

  // ── 입력 폼 ──
  return (
    <div style={{ padding: 16, background: T.cream, border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.gold}`, borderRadius: 8 }}>
      {showPrompt && (
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
          {t("profile.bizRegisterPrompt", null, "사업자 정보를 등록해주세요")}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: T.ink2, marginBottom: 12, lineHeight: 1.5 }}>
        {t("auth.bizVerifyDesc", null, "국세청 데이터로 실시간 인증됩니다. 사업자등록증 그대로 입력해주세요.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="text" inputMode="numeric" autoComplete="off" value={businessNumber}
          onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
          placeholder={t("auth.bizNumberPlaceholder", null, "사업자등록번호 (예: 119-75-73333)")} maxLength={12} style={inputStyle} />
        <input type="text" value={representativeName}
          onChange={(e) => setRepresentativeName(e.target.value)}
          placeholder={t("auth.bizRepNamePlaceholder", null, "대표자 성명 (예: 홍길동)")} style={inputStyle} />
        <input type="text" inputMode="numeric" autoComplete="off" value={openingDate}
          onChange={(e) => setOpeningDate(formatOpeningDate(e.target.value))}
          placeholder={t("auth.bizOpeningDatePlaceholder", null, "개업일자 (예: 2012-09-19)")} maxLength={10} style={inputStyle} />
        {error && (
          <div style={{ padding: 10, background: T.accentBg, color: T.accent, borderRadius: 6, fontSize: 12.5, lineHeight: 1.5, border: `1px solid ${T.accent}30` }}>
            {error}
          </div>
        )}
        <button type="button" onClick={verify} disabled={loading}
          style={{ width: "100%", padding: 12, borderRadius: 6, border: "none", background: loading ? T.borderStrong : T.navy, color: T.paper, fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: TYPE.family, letterSpacing: "-0.01em" }}>
          {loading ? t("auth.bizVerifying", null, "인증 중...") : t("auth.bizVerifyBtn", null, "사업자번호 인증하기 →")}
        </button>
      </div>
    </div>
  );
}
