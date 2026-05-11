"use client";
import { T, SEMANTIC, TYPE } from "@/lib/theme";

/**
 * Badge 컴포넌트 (BI v2 Section 8.1)
 *
 * 상태 / 카테고리 / 라벨을 표시하는 작은 배지.
 * 비자 배지는 별도 컴포넌트 (VisaBadge) 사용.
 *
 * @param {object} props
 * @param {("default"|"success"|"warning"|"error"|"info"|"neutral"|"coral"|"navy"|"gold")} [props.variant="default"]
 *   - default: 코랄 채움
 *   - success: 합격, 승인 (민트)
 *   - warning: 검토 중, 기한 임박 (주황)
 *   - error: 거절, 오류 (빨강)
 *   - info: 알림, 안내 (파랑)
 *   - neutral: 회색 (비활성 등)
 *   - coral / navy / gold: 브랜드 컬러
 * @param {("solid"|"soft"|"outline")} [props.style_="soft"] - 채움 스타일
 *   ※ solid는 채워진 배경, soft는 연한 배경, outline은 외곽선만
 * @param {("sm"|"md"|"lg")} [props.size="md"]
 * @param {React.ReactNode} [props.icon] - 좌측 아이콘 (이모지/SVG)
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Badge variant="success">합격</Badge>
 *   <Badge variant="warning" icon="⏰">검토 중</Badge>
 *   <Badge variant="error" style_="solid">거절</Badge>
 *   <Badge variant="neutral" size="sm">한국어 초급</Badge>
 */
export default function Badge({
  variant = "default",
  style_ = "soft",
  size = "md",
  icon,
  children,
  style,
  className,
}) {
  // ────────── 사이즈 ──────────
  const sizeStyles = {
    sm: { fontSize: 10, padding: "2px 6px", borderRadius: 4 },
    md: { fontSize: 11, padding: "3px 8px", borderRadius: 6 },
    lg: { fontSize: 13, padding: "5px 12px", borderRadius: 8 },
  };

  // ────────── 변형별 컬러 정의 ──────────
  const variantColors = {
    default: { color: T.coral, bg: T.coralL, on: T.paper },
    success: { color: SEMANTIC.success.color, bg: SEMANTIC.success.bg, on: SEMANTIC.success.text },
    warning: { color: SEMANTIC.warning.color, bg: SEMANTIC.warning.bg, on: SEMANTIC.warning.text },
    error: { color: SEMANTIC.error.color, bg: SEMANTIC.error.bg, on: SEMANTIC.error.text },
    info: { color: SEMANTIC.info.color, bg: SEMANTIC.info.bg, on: SEMANTIC.info.text },
    neutral: { color: T.ink3, bg: T.cream, on: T.ink2 },
    coral: { color: T.coral, bg: T.coralL, on: T.paper },
    navy: { color: T.navy, bg: T.cream, on: T.paper },
    gold: { color: T.gold, bg: T.goldL, on: T.navy },
  };

  const v = variantColors[variant] || variantColors.default;

  // ────────── 채움 스타일 ──────────
  let colorStyle;
  if (style_ === "solid") {
    colorStyle = { background: v.color, color: v.on };
  } else if (style_ === "soft") {
    colorStyle = { background: v.bg, color: v.color };
  } else {
    colorStyle = {
      background: "transparent",
      color: v.color,
      border: `1.5px solid ${v.color}`,
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
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </span>
  );
}
