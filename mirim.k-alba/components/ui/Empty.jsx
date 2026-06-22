"use client";
import { T, L, TYPE } from "@/lib/theme";

/**
 * Empty State 컴포넌트 (BI v2 Section 8.1)
 *
 * 데이터 없음 / 검색 결과 없음 / 권한 없음 / 에러 등 빈 상태 표시.
 *
 * @param {object} props
 * @param {("no-data"|"no-results"|"no-permission"|"error"|"coming-soon")} [props.variant="no-data"]
 *   - no-data: 데이터 없음 (기본 — 아직 등록 안됨)
 *   - no-results: 검색 결과 없음 (필터 결과 비어있음)
 *   - no-permission: 권한 없음
 *   - error: 오류 발생
 *   - coming-soon: 준비 중
 * @param {string} [props.title] - 메인 메시지 (변형별 기본값 자동)
 * @param {string} [props.description] - 부가 설명
 * @param {React.ReactNode} [props.icon] - 직접 아이콘 (이모지 추천)
 * @param {React.ReactNode} [props.action] - CTA 버튼
 * @param {("sm"|"md"|"lg")} [props.size="md"] - 패딩 크기
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Empty variant="no-data" />
 *
 *   <Empty
 *     variant="no-results"
 *     description="다른 검색어로 시도해보세요"
 *     action={<Button onClick={resetFilters}>필터 초기화</Button>}
 *   />
 *
 *   <Empty
 *     variant="error"
 *     title="공고를 불러오지 못했어요"
 *     action={<Button onClick={retry}>다시 시도</Button>}
 *   />
 */
export default function Empty({
  variant = "no-data",
  title,
  description,
  icon,
  action,
  size = "md",
  style,
  className,
}) {
  // 변형별 기본 메시지 + 아이콘
  const variants = {
    "no-data": {
      icon: "📭",
      title: "아직 데이터가 없어요",
      description: "첫 번째 항목을 추가해보세요",
    },
    "no-results": {
      icon: "🔍",
      title: "검색 결과가 없어요",
      description: "다른 검색어나 조건으로 시도해보세요",
    },
    "no-permission": {
      icon: "🔒",
      title: "접근 권한이 없어요",
      description: "이 페이지를 보려면 로그인이 필요해요",
    },
    "error": {
      icon: "⚠",
      title: "문제가 발생했어요",
      description: "잠시 후 다시 시도해주세요",
    },
    "coming-soon": {
      icon: "🚀",
      title: "곧 만나요",
      description: "이 기능은 준비 중이에요",
    },
  };

  const v = variants[variant] || variants["no-data"];

  // 사이즈
  const paddingValues = {
    sm: { padding: 24, iconSize: 36, titleSize: 14, descSize: 12 },
    md: { padding: 40, iconSize: 48, titleSize: 16, descSize: 13 },
    lg: { padding: 56, iconSize: 64, titleSize: 18, descSize: 14 },
  };
  const s = paddingValues[size];

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: s.padding,
        background: T.paper,
        border: `1.5px dashed ${T.borderStrong}`,
        borderRadius: L.rLg,
        fontFamily: TYPE.family,
        minHeight: 200,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: s.iconSize,
          lineHeight: 1,
          marginBottom: 16,
          opacity: 0.7,
        }}
      >
        {icon || v.icon}
      </div>

      <h3
        style={{
          fontSize: s.titleSize,
          fontWeight: 700,
          color: T.ink,
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}
      >
        {title || v.title}
      </h3>

      {(description || v.description) && (
        <p
          style={{
            fontSize: s.descSize,
            color: T.ink3,
            lineHeight: 1.6,
            maxWidth: 320,
            margin: "0 auto",
          }}
        >
          {description || v.description}
        </p>
      )}

      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
