"use client";
import { useState } from "react";
import { T, L, TYPE } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/**
 * BusinessVerify — 사업자(국세청) 인증 공용 컴포넌트
 *
 * 가입 단계에서 분리되어, 로그인 후 공고등록/프로필 등에서 재사용한다.
 * 인증 성공(국세청 NTS valid) 시 현재 사용자 profiles 행에
 * { business_number, verified: true } 를 저장하고 onVerified 콜백을 호출한다.
 *
 * @param {string} userId 현재 사용자 id (profiles.id)
 * @param {(info:{business_number:string,status:string})=>void} [onVerified]
 * @param {boolean} [showPrompt=true] 상단 "사업자 정보를 등록해주세요" 안내 표시
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
      const res = await fetch("/api/verify-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessNumber: bn,
          representativeName: representativeName.trim(),
          openingDate: od,
        }),
      });
      const data = await res.json();
      if (data.valid === true) {
        // 국세청 인증 통과 → 프로필에 저장
        if (supabase && userId) {
          const { error: upErr } = await supabase
            .from("profiles")
            .update({ business_number: bn, verified: true })
            .eq("id", userId);
          if (upErr) {
            setError(upErr.message);
            setLoading(false);
            return;
          }
        }
        onVerified?.({ business_number: bn, status: data.status || t("auth.bizStatusNormal", null, "정상") });
      } else {
        setError(data.error || t("auth.bizVerifyFailed", null, "인증에 실패했어요. 입력 정보를 확인해 주세요."));
      }
    } catch (e) {
      setError(t("auth.bizVerifyServerError", null, "인증 서버 오류예요. 잠시 후 다시 시도해 주세요."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        background: T.cream,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.gold}`,
        borderRadius: 8,
      }}
    >
      {showPrompt && (
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
          {t("profile.bizRegisterPrompt", null, "사업자 정보를 등록해주세요")}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: T.ink2, marginBottom: 12, lineHeight: 1.5 }}>
        {t("auth.bizVerifyDesc", null, "국세청 데이터로 실시간 인증됩니다. 사업자등록증 그대로 입력해주세요.")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={businessNumber}
          onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
          placeholder={t("auth.bizNumberPlaceholder", null, "사업자등록번호 (예: 119-75-73333)")}
          maxLength={12}
          style={inputStyle}
        />
        <input
          type="text"
          value={representativeName}
          onChange={(e) => setRepresentativeName(e.target.value)}
          placeholder={t("auth.bizRepNamePlaceholder", null, "대표자 성명 (예: 홍길동)")}
          style={inputStyle}
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={openingDate}
          onChange={(e) => setOpeningDate(formatOpeningDate(e.target.value))}
          placeholder={t("auth.bizOpeningDatePlaceholder", null, "개업일자 (예: 2012-09-19)")}
          maxLength={10}
          style={inputStyle}
        />
        {error && (
          <div style={{ padding: 8, background: T.accentBg, color: T.accent, borderRadius: 6, fontSize: 12.5 }}>
            {error}
          </div>
        )}
        <button
          type="button"
          onClick={verify}
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 6,
            border: "none",
            background: loading ? T.borderStrong : T.navy,
            color: T.paper,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            fontFamily: TYPE.family,
            letterSpacing: "-0.01em",
          }}
        >
          {loading ? t("auth.bizVerifying", null, "인증 중...") : t("auth.bizVerifyBtn", null, "사업자번호 인증하기 →")}
        </button>
      </div>
    </div>
  );
}
