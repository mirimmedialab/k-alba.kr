"use client";
import { T, TYPE } from "@/lib/theme";

/**
 * Button 컴포넌트 (BI v2 Section 8.1)
 *
 * K-ALBA 표준 버튼. 인앱과 랜딩에서 사용하는 모든 변형 포함.
 *
 * @param {object} props
 * @param {("primary"|"primaryDark"|"secondary"|"ghost"|"destructive"|"landingPrimary"|"landingDark")} [props.variant="primary"]
 *   - primary: 코랄 (인앱 메인 CTA — 알바 시작하기, 지원하기)
 *   - primaryDark: 차분한 코랄 (사장님 페이지)
 *   - secondary: 외곽선 + 네이비 텍스트
 *   - ghost: 투명 배경 + 코랄 텍스트
 *   - destructive: 빨강 (삭제, 거절 등)
 *   - landingPrimary: 골드 (데스크톱 랜딩 CTA — 사장님으로 시작)
 *   - landingDark: 네이비 (데스크톱 랜딩 보조 CTA)
 * @param {("sm"|"md"|"lg")} [props.size="md"] - 사이즈
 * @param {boolean} [props.fullWidth] - 가로 100%
 * @param {boolean} [props.disabled]
 * @param {React.ReactNode} [props.icon] - 좌측 아이콘
 * @param {React.ReactNode} props.children
 * @param {function} [props.onClick]
 * @param {string} [props.type="button"]
 * @param {string} [props.href] - 있으면 a 태그로 렌더
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Button variant="primary">지원하기</Button>
 *   <Button variant="primaryDark" size="lg">공고 등록</Button>
 *   <Button variant="ghost" icon={<ArrowRight/>}>자세히 보기</Button>
 *   <Button variant="landingPrimary" href="/signup">사장님으로 시작</Button>
 */
export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  icon,
  children,
  onClick,
  type = "button",
  href,
  style,
  className,
}) {
  // ────────── 변형별 색상 ──────────
  const variantStyles = {
    primary: {
      background: T.coral,
      color: T.paper,
      border: "none",
    },
    primaryDark: {
      background: T.coralDark,
      color: T.paper,
      border: "none",
    },
    secondary: {
      background: T.paper,
      color: T.navy,
      border: `1.5px solid ${T.navy}`,
    },
    ghost: {
      background: "transparent",
      color: T.coral,
      border: "none",
    },
    destructive: {
      background: T.error,
      color: T.paper,
      border: "none",
    },
    landingPrimary: {
      background: T.gold,
      color: T.navy,
      border: "1px solid transparent",
      borderRadius: 4,                  // 랜딩은 샤프한 모서리
      letterSpacing: "-0.01em",
    },
    landingDark: {
      background: T.navy,
      color: T.paper,
      border: "1px solid transparent",
      borderRadius: 4,
      letterSpacing: "-0.01em",
    },
  };

  // ────────── 사이즈 ──────────
  const sizeStyles = {
    sm: { padding: "8px 14px", fontSize: 12 },
    md: { padding: "12px 20px", fontSize: 14 },
    lg: { padding: "14px 28px", fontSize: 16 },
  };

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontWeight: 700,
    borderRadius: 10,
    fontFamily: TYPE.family,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? "100%" : "auto",
    transition: "all 0.15s",
    textDecoration: "none",
    whiteSpace: "nowrap",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  const content = (
    <>
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} className={className} style={baseStyle}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={baseStyle}
    >
      {content}
    </button>
  );
}
