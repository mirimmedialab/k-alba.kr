"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { Button, Badge, ButtonLoading } from "@/components/ui";
import { normalizeBusinessNumber } from "@/lib/business-verify";

/**
 * 회원가입 사업자번호 검증 단계 (BI v2)
 *
 * 사용:
 *   <BusinessVerifyStep
 *     onVerified={(result) => setBusinessVerified(result)}
 *     onSkip={() => alert("사업자만 진행 가능")}
 *   />
 *
 * 동작:
 *   1. 사용자가 사업자번호 입력
 *   2. [검증하기] 클릭 → /api/business/verify 호출
 *   3. 통과 → 다음 단계 unlock
 *   4. 실패 → 사유 안내 + 재시도
 *
 * 디자인:
 *   - BI v2 골드 라인 (회원가입 = 신뢰 톤)
 *   - 결과 → Badge 시맨틱 (success/error/warning)
 *   - 자동 형식 변환 (119-86-61402 ↔ 1198661402)
 */
export default function BusinessVerifyStep({ onVerified, onBack }) {
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // 자동 하이픈 (xxx-xx-xxxxx)
  const formatted = (() => {
    const digits = input.replace(/[^\d]/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 10)}`;
  })();

  const handleVerify = async () => {
    const normalized = normalizeBusinessNumber(input);
    if (!normalized) {
      setResult({ valid: false, error: "사업자번호는 10자리 숫자여야 합니다" });
      return;
    }

    setVerifying(true);
    setAttempts((n) => n + 1);

    try {
      const res = await fetch("/api/business/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessNumber: normalized }),
      });
      const data = await res.json();
      setResult(data);

      if (data.valid && onVerified) {
        // 검증 통과 → 부모 컴포넌트로 결과 전달
        onVerified({
          businessNumber: normalized,
          status: data.status,
          taxType: data.taxType,
        });
      }
    } catch (e) {
      setResult({ valid: false, error: "검증 서버 오류 — 잠시 후 다시 시도해 주세요" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 20px" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Business Verification · 사업자 인증
      </div>
      <h1 style={{
        fontSize: 24, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 8, lineHeight: 1.3,
      }}>
        사업자등록번호를 확인할게요
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        K-ALBA는 정식 사업자만 사장님으로 가입할 수 있어요.
        <br />국세청 시스템과 자동 연동되어 즉시 검증됩니다.
      </p>

      {/* 입력 필드 */}
      <label style={{ display: "block", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
          사업자등록번호
        </div>
        <input
          type="text"
          value={formatted}
          onChange={(e) => {
            setInput(e.target.value);
            setResult(null);
          }}
          placeholder="123-45-67890"
          maxLength={12}
          disabled={verifying || result?.valid}
          style={{
            width: "100%",
            padding: "12px 14px",
            border: `2px solid ${result?.valid ? "#10B981" : T.border}`,
            borderRadius: 6,
            fontSize: 16,
            fontFamily: "inherit",
            outline: "none",
            background: result?.valid ? "#F0FDF4" : T.paper,
            color: T.ink,
            boxSizing: "border-box",
            letterSpacing: "0.04em",
          }}
        />
      </label>

      {/* 검증 결과 */}
      {result && (
        <div style={{ marginBottom: 18 }}>
          {result.valid ? (
            <div style={{
              padding: 14,
              background: "#F0FDF4",
              border: "1px solid #A7F3D0",
              borderRadius: 6,
            }}>
              <Badge variant="success" size="md" icon="✅">
                정상 사업자입니다
              </Badge>
              <div style={{ fontSize: 12, color: T.ink, marginTop: 8, lineHeight: 1.6 }}>
                상태: <strong>{result.status}</strong>
                <br />과세 유형: <strong>{result.taxType || "조회됨"}</strong>
              </div>
            </div>
          ) : (
            <div style={{
              padding: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 6,
            }}>
              <Badge variant="error" size="md" icon="❌">
                인증 실패
              </Badge>
              <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 8, lineHeight: 1.6 }}>
                {result.error}
              </div>
              {attempts >= 3 && (
                <div style={{ fontSize: 11, color: T.ink2, marginTop: 10, lineHeight: 1.6 }}>
                  💡 여러 번 실패하셨나요? 사업자번호가 정확한지 확인하시거나,{" "}
                  <a href="mailto:contact@k-alba.kr" style={{ color: "#1E40AF", fontWeight: 600 }}>
                    운영팀에 문의
                  </a>
                  해 주세요.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 버튼 */}
      <div style={{ display: "flex", gap: 8 }}>
        {onBack && (
          <Button variant="secondary" size="lg" onClick={onBack}>
            이전
          </Button>
        )}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleVerify}
          disabled={verifying || result?.valid || input.replace(/[^\d]/g, "").length !== 10}
        >
          {verifying ? <ButtonLoading text="국세청 조회 중..." /> :
           result?.valid ? "✅ 인증됨 — 다음 단계" :
           "사업자번호 검증하기"}
        </Button>
      </div>

      {/* 안내 */}
      <div style={{
        marginTop: 24,
        padding: 14,
        background: T.cream,
        borderLeft: `3px solid ${T.gold}`,
        fontSize: 11,
        color: T.ink2,
        lineHeight: 1.7,
      }}>
        🔒 <strong>안전한 검증</strong><br />
        - 국세청 공공데이터 API 사용 (https://www.data.go.kr)<br />
        - 사업자번호 외 개인정보는 전송되지 않습니다<br />
        - 휴/폐업 사업자는 가입할 수 없습니다
      </div>
    </div>
  );
}
