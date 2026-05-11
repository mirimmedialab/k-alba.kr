"use client";
import { T, L, TYPE } from "@/lib/theme";

/**
 * Card 컴포넌트 (BI v2 Section 8.1)
 *
 * K-ALBA 표준 카드. 일반 / 사장님 / 빈 상태 / 강조 4가지 변형.
 *
 * @param {object} props
 * @param {("default"|"employer"|"empty"|"highlight")} [props.variant="default"]
 *   - default: 흰 배경 + 보더 (일반 카드)
 *   - employer: 흰 배경 + 상단 골드 라인 (사장님 페이지 신뢰 액센트)
 *   - empty: 크림 배경 + 점선 보더 (빈 상태)
 *   - highlight: 코랄 배경 + 흰 텍스트 (강조 카드)
 * @param {("sm"|"md"|"lg")} [props.padding="md"] - 패딩 크기
 *   - sm: 12px
 *   - md: 20px (기본)
 *   - lg: 32px
 * @param {boolean} [props.hoverable] - 호버 효과
 * @param {function} [props.onClick] - 클릭 핸들러 (있으면 cursor:pointer)
 * @param {React.ReactNode} props.children
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Card>
 *     <CardTitle>카페 바리스타</CardTitle>
 *     <CardSubtitle>블루보틀 강남점</CardSubtitle>
 *   </Card>
 *
 *   <Card variant="employer">
 *     <h3>지원자 3명</h3>
 *   </Card>
 *
 *   <Card variant="empty">
 *     <p>아직 등록된 공고가 없어요</p>
 *   </Card>
 */
export default function Card({
  variant = "default",
  padding = "md",
  hoverable = false,
  onClick,
  children,
  style,
  className,
}) {
  // ────────── 패딩 ──────────
  const paddingValues = {
    sm: 12,
    md: 20,
    lg: 32,
  };

  // ────────── 변형 ──────────
  const variantStyles = {
    default: {
      background: T.paper,
      border: L.border,
      borderRadius: L.rLg,
    },
    employer: {
      background: T.paper,
      border: L.border,
      borderTop: `2px solid ${T.gold}`,        // 사장님 페이지 골드 액센트 (BI v2)
      borderRadius: L.rLg,
    },
    empty: {
      background: T.cream,
      border: `1.5px dashed ${T.borderStrong}`,
      borderRadius: L.rLg,
      textAlign: "center",
    },
    highlight: {
      background: T.coral,
      color: T.paper,
      border: "none",
      borderRadius: L.rLg,
    },
  };

  const baseStyle = {
    padding: paddingValues[padding],
    fontFamily: TYPE.family,
    transition: hoverable || onClick ? "transform 0.15s, box-shadow 0.15s" : undefined,
    cursor: onClick ? "pointer" : undefined,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
      onClick={onClick}
      className={className}
      style={baseStyle}
      onMouseEnter={hoverable ? (e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = L.shadowMd;
      } : undefined}
      onMouseLeave={hoverable ? (e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Card 안에서 자주 쓰는 헬퍼 컴포넌트들
 */

export function CardTitle({ children, style, className }) {
  return (
    <h3
      className={className}
      style={{
        ...TYPE.h3Style,
        color: T.ink,
        marginBottom: 4,
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

export function CardSubtitle({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        fontSize: 13,
        color: T.ink3,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardDivider({ style }) {
  return (
    <div
      style={{
        height: 1,
        background: T.border,
        margin: "12px 0",
        ...style,
      }}
    />
  );
}

export function CardFooter({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTop: L.border,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
