"use client";
import { VISA, TYPE } from "@/lib/theme";

/**
 * VisaBadge 컴포넌트 (BI v2 Section 0.4 — Visa Color System)
 *
 * 비자 코드를 시각적으로 구분하는 배지. 외국인이 한국어 모르고도
 * "내 비자로 일할 수 있는 자리"를 5초 안에 인식하게 하는 핵심 컴포넌트.
 *
 * 7가지 비자 자동 매핑:
 *   D-2 (유학) - 민트
 *   D-4 (어학연수) - 청록
 *   E-9 (비전문취업) - 코랄
 *   F-2 (거주) - 골드
 *   F-4 (재외동포) - 보라
 *   F-5 (영주) - 네이비
 *   H-2 (방문취업) - 주황
 *
 * @param {object} props
 * @param {("D-2"|"D-4"|"E-9"|"F-2"|"F-4"|"F-5"|"H-2"|string)} props.code
 *   - 표준 7종 비자 코드 또는 자유 코드 (소문자 변형 D2, e9 등도 자동 인식)
 * @param {("solid"|"soft"|"outline")} [props.variant="solid"]
 *   - solid: 채워진 배경 (가장 명확)
 *   - soft: 연한 배경 + 진한 텍스트
 *   - outline: 외곽선만 (절제된 표시)
 * @param {("sm"|"md"|"lg")} [props.size="md"] - 사이즈
 * @param {boolean} [props.showLabel=false] - 라벨도 표시 ("E-9 비전문취업")
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <VisaBadge code="E-9" />                          // E-9 (코랄)
 *   <VisaBadge code="D-2" variant="soft" />           // D-2 (연한 민트)
 *   <VisaBadge code="F-2" size="lg" showLabel />      // F-2 거주 (골드, 라벨 포함)
 */
export default function VisaBadge({
  code,
  variant = "solid",
  size = "md",
  showLabel = false,
  style,
  className,
}) {
  // 코드 정규화 (E9 → E-9, e-9 → E-9 등)
  const normalized = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const visaKey = normalized.length >= 2 ? `${normalized[0]}${normalized.slice(1)}` : normalized;

  // VISA 객체에서 매칭 (D2 → VISA.D2)
  const visa = VISA[visaKey] || null;

  // ────────── 사이즈 ──────────
  const sizeStyles = {
    sm: { fontSize: 10, padding: "2px 6px", borderRadius: 4 },
    md: { fontSize: 11, padding: "3px 8px", borderRadius: 6 },
    lg: { fontSize: 13, padding: "5px 12px", borderRadius: 8 },
  };

  // ────────── 색상 (variant별) ──────────
  let colorStyle;

  if (visa) {
    if (variant === "solid") {
      colorStyle = {
        background: visa.color,
        color: visa.textOn,
      };
    } else if (variant === "soft") {
      colorStyle = {
        background: visa.bg,
        color: visa.color,
      };
    } else {
      colorStyle = {
        background: "transparent",
        color: visa.color,
        border: `1.5px solid ${visa.color}`,
      };
    }
  } else {
    // 알 수 없는 비자 코드 → 회색 fallback
    colorStyle = {
      background: "#E5E7EB",
      color: "#6B7280",
    };
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontWeight: 700,
        fontFamily: TYPE.family,
        whiteSpace: "nowrap",
        letterSpacing: 0,
        ...sizeStyles[size],
        ...colorStyle,
        ...style,
      }}
    >
      {visa?.code || code}
      {showLabel && visa?.label && (
        <span style={{ fontWeight: 500, opacity: 0.85 }}>· {visa.label}</span>
      )}
    </span>
  );
}
