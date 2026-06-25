"use client";
import { useState } from "react";
import { T, L, TYPE } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/**
 * BusinessVerify — 사업자(국세청) 인증 공용 컴포넌트
 *
 * 입력 → "사업자번호 인증하기" → 국세청 NTS 진위확인(/api/verify-business, 로그인 토큰 동봉)
 *   - 일치 & 계속사업자 → 서버가 verified 저장 → "✓ 사업자 인증이 완료되었습니다" + "계속하기"
 *   - 불일치/휴폐업 → 사유 메시지 표시(재시도)
 *
 * @param {string} userId
 * @param {(info)=>void} [onVerified]
 * @param {boolean} [showPrompt=true]  상단 "사업자 정보를 등록해주세요" 표시
 * @param {boolean} [horizontal=false] 입력 3개를 가로로 배치(데스크탑)
 * @param {boolean} [bare=false]       외곽 박스/안내 없이 입력+버튼만(부모가 컨테이너 제공)
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

export default function BusinessVerify({ userId, onVerified, showPrompt = true, horizontal = false, bare = false }) {
  const t = useT();
  const [businessNumber, setBusinessNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [openingDate, setOpeningDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

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
  const cellStyle = horizontal ? { ...inputStyle, flex: "1 1 200px", minWidth: 0 } : inputStyle;

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
      let token = "";
      try { const { data: s } = await supabase.auth.getSession(); token = s?.session?.access_token || ""; } catch (_) {}
      const res = await fetch("/api/verify-business", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ businessNumber: bn, representativeName: representativeName.trim(), openingDate: od }),
      });
      const data = await res.json();
      if (data.valid === true) {
        if (!data.persisted && supabase && userId) {
          try { await supabase.from("profiles").update({ business_number: bn, verified: true }).eq("id", userId); } catch (_) {}
        }
        setLoading(false);
        setDone({ business_number: bn, status: data.status || t("auth.bizStatusNormal", null, "정상"), taxType: data.taxType || "" });
      } else {
        setLoading(false);
        setError(data.error || t("auth.bizMismatch", null, "입력하신 정보가 국세청 자료와 일치하지 않아요. 사업자등록증에 적힌 내용 그대로 다시 확인해 주세요."));
      }
    } catch (e) {
      setLoading(false);
      setError(t("auth.bizVerifyServerError", null, "인증 서버 오류예요. 잠시 후 다시 시도해 주세요."));
    }
  };

  // 성공 화면
  if (done) {
    return (
      <div style={{ padding: 16, background: "#F0F7F2", border: `1px solid ${T.green}`, borderLeft: `3px solid ${T.green}`, borderRadius: 8, textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.green, marginBottom: 8 }}>
          {t("auth.bizVerifiedTitle", null, "✓ 사업자 인증이 완료되었습니다")}
        </div>
        <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.8, marginBottom: 14 }}>
          <div>{t("auth.bizNumber", null, "사업자등록번호")} · <strong style={{ color: T.ink }}>{done.business_number}</strong></div>
          <div>{t("profile.verificationStatus", null, "상태")} · <strong style={{ color: T.ink }}>{done.status}</strong>{done.taxType ? ` · ${done.taxType}` : ""}</div>
        </div>
        <button type="button" onClick={() => onVerified?.(done)}
          style={{ width: "100%", padding: 12, borderRadius: 6, border: "none", background: T.green, color: T.paper, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: TYPE.family }}>
          {t("auth.bizContinue", null, "계속하기 →")}
        </button>
      </div>
    );
  }

  // 입력 폼 본문
  const inner = (
    <div style={{ textAlign: "left" }}>
      <div style={{ display: "flex", flexDirection: horizontal ? "row" : "column", flexWrap: "wrap", gap: 10 }}>
        <input type="text" inputMode="numeric" autoComplete="off" value={businessNumber}
          onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
          placeholder={t("auth.bizNumberPlaceholder", null, "사업자등록번호 (예: 119-75-73333)")} maxLength={12} style={cellStyle} />
        <input type="text" value={representativeName}
          onChange={(e) => setRepresentativeName(e.target.value)}
          placeholder={t("auth.bizRepNamePlaceholder", null, "대표자 성명 (예: 홍길동)")} style={cellStyle} />
        <input type="text" inputMode="numeric" autoComplete="off" value={openingDate}
          onChange={(e) => setOpeningDate(formatOpeningDate(e.target.value))}
          placeholder={t("auth.bizOpeningDatePlaceholder", null, "개업일자 (예: 2012-09-19)")} maxLength={10} style={cellStyle} />
      </div>
      {error && (
        <div style={{ marginTop: 8, padding: 10, background: T.accentBg, color: T.accent, borderRadius: 6, fontSize: 12.5, lineHeight: 1.5, border: `1px solid ${T.accent}30` }}>
          {error}
        </div>
      )}
      <button type="button" onClick={verify} disabled={loading}
        style={{ width: "100%", marginTop: 16, padding: 13, borderRadius: 6, border: "none", background: loading ? T.borderStrong : T.navy, color: T.paper, fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer", fontFamily: TYPE.family }}>
        {loading ? t("auth.bizVerifying", null, "인증 중...") : t("auth.bizVerifyBtn", null, "사업자번호 인증하기 →")}
      </button>
    </div>
  );

  if (bare) return inner;

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
      {inner}
    </div>
  );
}
