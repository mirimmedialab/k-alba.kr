"use client";
import { T, TYPE } from "@/lib/theme";

/**
 * Loading 컴포넌트들 (BI v2 Section 8.1)
 *
 * 4가지 로딩 변형:
 *   1. <PageLoading /> — 전체 페이지 로딩
 *   2. <InlineLoading /> — 인라인 (콘텐츠 영역)
 *   3. <ButtonLoading /> — 버튼 안 (스피너 + 텍스트)
 *   4. <Skeleton /> — 콘텐츠 스켈레톤
 *
 * @example
 *   {loading ? <PageLoading /> : <Content />}
 *
 *   <Button>{submitting ? <ButtonLoading text="저장 중..." /> : "저장"}</Button>
 *
 *   {loading ? (
 *     <Skeleton lines={3} />
 *   ) : (
 *     <Card>...</Card>
 *   )}
 */


// ════════════════════════════════════════════════════════════════════
// Spinner — 핵심 스피너 (다른 로딩의 빌딩 블록)
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {number} [props.size=24] - 픽셀 크기
 * @param {string} [props.color] - 컬러 (기본 코랄)
 * @param {number} [props.thickness=2.5] - 선 두께
 */
export function Spinner({ size = 24, color = T.coral, thickness = 2.5, style }) {
  return (
    <span
      role="status"
      aria-label="loading"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `${thickness}px solid ${T.border}`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "k-spin 0.7s linear infinite",
        ...style,
      }}
    >
      <style>{`
        @keyframes k-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}


// ════════════════════════════════════════════════════════════════════
// PageLoading — 전체 페이지 로딩
// ════════════════════════════════════════════════════════════════════

/**
 * 페이지 진입 시 콘텐츠가 준비될 때까지 보여주는 로딩.
 * 화면 가운데에 스피너 + 메시지.
 *
 * @param {object} props
 * @param {string} [props.message="잠시만 기다려주세요"]
 * @param {boolean} [props.fullscreen=false] - 화면 전체 (overlay)
 * @param {number} [props.minHeight=400] - 최소 높이
 */
export function PageLoading({ message = "잠시만 기다려주세요", fullscreen, minHeight = 400 }) {
  const baseStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    fontFamily: TYPE.family,
  };

  const fullscreenStyle = fullscreen
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
      }
    : {
        minHeight,
        width: "100%",
      };

  return (
    <div style={{ ...baseStyle, ...fullscreenStyle }}>
      <Spinner size={36} thickness={3} />
      {message && (
        <div style={{ fontSize: 14, color: T.ink2, fontWeight: 500 }}>
          {message}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// InlineLoading — 인라인 로딩 (작은 영역)
// ════════════════════════════════════════════════════════════════════

/**
 * 카드 내부, 섹션 안 등 부분 로딩.
 *
 * @param {object} props
 * @param {string} [props.message]
 * @param {("sm"|"md")} [props.size="md"]
 */
export function InlineLoading({ message, size = "md", style, className }) {
  const sizes = {
    sm: { spinner: 16, font: 12, gap: 8 },
    md: { spinner: 20, font: 13, gap: 10 },
  };

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sizes[size].gap,
        color: T.ink3,
        fontSize: sizes[size].font,
        fontFamily: TYPE.family,
        ...style,
      }}
    >
      <Spinner size={sizes[size].spinner} thickness={2} />
      {message && <span>{message}</span>}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// ButtonLoading — 버튼 안의 로딩 (Button 컴포넌트와 함께)
// ════════════════════════════════════════════════════════════════════

/**
 * Button 컴포넌트의 children으로 사용.
 * 흰색 작은 스피너 + (선택) 텍스트.
 *
 * @example
 *   <Button variant="primary" disabled={submitting}>
 *     {submitting ? <ButtonLoading text="저장 중..." /> : "저장"}
 *   </Button>
 */
export function ButtonLoading({ text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Spinner size={14} thickness={2} color={T.paper} />
      {text && <span>{text}</span>}
    </span>
  );
}


// ════════════════════════════════════════════════════════════════════
// Skeleton — 콘텐츠 스켈레톤
// ════════════════════════════════════════════════════════════════════

/**
 * 데이터 로딩 중 콘텐츠 모양을 미리 보여주는 회색 박스.
 *
 * @param {object} props
 * @param {("text"|"title"|"avatar"|"image"|"card"|"button")} [props.variant="text"]
 * @param {number} [props.lines=1] - text/title 변형의 줄 수
 * @param {string} [props.width] - CSS width (기본 100%)
 * @param {number} [props.height] - 픽셀 높이
 * @param {object} [props.style]
 *
 * @example
 *   <Skeleton lines={3} />                  // 텍스트 3줄
 *   <Skeleton variant="title" />            // 제목 1줄
 *   <Skeleton variant="avatar" />           // 원형 아바타
 *   <Skeleton variant="card" />             // 카드 모양
 */
export function Skeleton({ variant = "text", lines = 1, width, height, style, className }) {
  const animationStyle = {
    background: `linear-gradient(90deg, ${T.cream} 25%, ${T.border} 50%, ${T.cream} 75%)`,
    backgroundSize: "200% 100%",
    animation: "k-skeleton 1.5s ease-in-out infinite",
    borderRadius: 6,
  };

  const variantStyles = {
    text: { height: 14, width: width || "100%" },
    title: { height: 24, width: width || "60%" },
    avatar: {
      width: width || 48,
      height: height || 48,
      borderRadius: "50%",
    },
    image: {
      width: width || "100%",
      height: height || 200,
      borderRadius: 8,
    },
    card: {
      width: width || "100%",
      height: height || 120,
      borderRadius: 12,
    },
    button: { height: 40, width: width || 120, borderRadius: 10 },
  };

  // text/title은 lines 만큼 반복
  if ((variant === "text" || variant === "title") && lines > 1) {
    return (
      <div className={className} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            style={{
              ...animationStyle,
              ...variantStyles[variant],
              // 마지막 줄은 짧게 (자연스러움)
              width: i === lines - 1 ? "70%" : variantStyles[variant].width,
            }}
          />
        ))}
        <style>{`
          @keyframes k-skeleton {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div
        className={className}
        style={{
          ...animationStyle,
          ...variantStyles[variant],
          ...style,
        }}
      />
      <style>{`
        @keyframes k-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}


// ════════════════════════════════════════════════════════════════════
// SkeletonCard — 자주 쓰는 카드 스켈레톤 조합
// ════════════════════════════════════════════════════════════════════

/**
 * Job Card 같은 형태의 스켈레톤. 직접 만들 필요 없이 사용.
 */
export function SkeletonCard({ style, className }) {
  return (
    <div
      className={className}
      style={{
        background: T.paper,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...style,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <Skeleton width="50px" height={20} />
        <Skeleton width="80px" height={20} />
      </div>
      <Skeleton variant="title" />
      <Skeleton variant="text" width="60%" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <Skeleton width="80px" height={28} />
        <Skeleton variant="button" width={80} />
      </div>
    </div>
  );
}


// 기본 export — 가장 흔히 쓰는 PageLoading
export default PageLoading;
