"use client";
import { T, TYPE } from "@/lib/theme";

/**
 * K-ALBA 워드마크 컴포넌트 (BI v2 Section 0.1)
 *
 * "K"는 코랄, "-ALBA"는 네이비/흰색으로 표시되는 K-ALBA 공식 로고.
 *
 * @param {object} props
 * @param {("light"|"dark"|"mono")} [props.variant="light"] - 변형
 *   - light: 흰 배경용 (K=코랄, -ALBA=네이비) — 기본
 *   - dark: 어두운 배경용 (K=코랄, -ALBA=흰색)
 *   - mono: 단색 (모두 네이비) — 인쇄, 흑백 등
 * @param {number} [props.size=24] - 폰트 크기 (px)
 * @param {object} [props.style] - 추가 스타일
 * @param {string} [props.className] - 추가 클래스
 *
 * @example
 *   <KWordmark size={32} />              // 헤더
 *   <KWordmark variant="dark" size={48}/> // 다크 헤더
 *   <KWordmark variant="mono" size={20}/> // PDF
 */
export default function KWordmark({
  variant = "light",
  size = 24,
  style,
  className,
}) {
  const colors = {
    light: { k: T.coral, alba: T.navy },
    dark: { k: T.coral, alba: T.paper },
    mono: { k: T.navy, alba: T.navy },
  }[variant];

  return (
    <span
      className={className}
      style={{
        fontFamily: TYPE.family,
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "baseline",
        // 좁은 네브바 등에서 하이픈(-) 지점에 줄바꿈되어 "K-/ALBA"로 깨지는 것 방지
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...style,
      }}
    >
      <span style={{ color: colors.k }}>K</span>
      <span style={{ color: colors.alba }}>-ALBA</span>
    </span>
  );
}
