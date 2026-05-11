"use client";
import { T, L, TYPE } from "@/lib/theme";

/**
 * Form 컴포넌트들 (BI v2 Section 8.1)
 *
 * 폼 레이아웃과 Validation 패턴을 단순화하는 헬퍼 컴포넌트들.
 *
 * 구성:
 *   <Form onSubmit={handleSubmit}>
 *     <FormSection title="기본 정보">
 *       <FormField label="이름" required>
 *         <Input ... />
 *       </FormField>
 *       <FormField label="비자" hint="합법적 취업 가능 비자만 선택">
 *         <Select ... />
 *       </FormField>
 *     </FormSection>
 *
 *     <FormActions>
 *       <Button variant="secondary">취소</Button>
 *       <Button variant="primary" type="submit">저장</Button>
 *     </FormActions>
 *   </Form>
 */


// ════════════════════════════════════════════════════════════════════
// Form — 최상위 form 태그
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {function} props.onSubmit - (e) => void
 * @param {React.ReactNode} props.children
 * @param {("narrow"|"normal"|"wide")} [props.maxWidth="normal"]
 *   - narrow: 480px
 *   - normal: 600px (기본)
 *   - wide: 820px
 * @param {object} [props.style]
 * @param {string} [props.className]
 */
export function Form({
  onSubmit,
  children,
  maxWidth = "normal",
  style,
  className,
}) {
  const widths = { narrow: 480, normal: 600, wide: 820 };

  return (
    <form
      onSubmit={onSubmit}
      className={className}
      style={{
        width: "100%",
        maxWidth: widths[maxWidth],
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: TYPE.family,
        ...style,
      }}
    >
      {children}
    </form>
  );
}


// ════════════════════════════════════════════════════════════════════
// FormSection — 그룹 (제목 + 필드들)
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.divider=false] - 하단에 구분선
 */
export function FormSection({ title, description, children, divider = false, style, className }) {
  return (
    <section
      className={className}
      style={{
        paddingBottom: divider ? 24 : 0,
        borderBottom: divider ? L.border : "none",
        ...style,
      }}
    >
      {title && (
        <div style={{ marginBottom: 16 }}>
          <h3
            style={{
              ...TYPE.h3Style,
              color: T.ink,
              marginBottom: description ? 4 : 0,
            }}
          >
            {title}
          </h3>
          {description && (
            <p style={{ fontSize: 13, color: T.ink3, lineHeight: 1.6 }}>
              {description}
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </section>
  );
}


// ════════════════════════════════════════════════════════════════════
// FormField — 라벨 + 입력 + 도움말 + 에러
// ════════════════════════════════════════════════════════════════════

/**
 * Input/Select 자체에도 label/hint/error props가 있지만,
 * FormField는 더 일관된 레이아웃 제공 (라벨 위에 위치, 도움말 아래).
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {React.ReactNode} props.children - 입력 컴포넌트
 * @param {("vertical"|"horizontal")} [props.layout="vertical"]
 *   - vertical: 라벨 위 + 입력 아래 (기본)
 *   - horizontal: 라벨 좌측 + 입력 우측 (데스크톱 폼)
 */
export function FormField({
  label,
  hint,
  error,
  required,
  children,
  layout = "vertical",
  style,
  className,
}) {
  if (layout === "horizontal") {
    return (
      <div
        className={className}
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          alignItems: "start",
          gap: 16,
          ...style,
        }}
      >
        {label && (
          <label
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              paddingTop: 12,
              letterSpacing: "-0.01em",
            }}
          >
            {label}
            {required && <span style={{ color: T.error, marginLeft: 4 }}>*</span>}
          </label>
        )}

        <div>
          {children}
          {(error || hint) && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: error ? T.error : T.ink3,
                lineHeight: 1.5,
              }}
            >
              {error || hint}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
          {required && <span style={{ color: T.error, marginLeft: 4 }}>*</span>}
        </label>
      )}

      {children}

      {(error || hint) && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: error ? T.error : T.ink3,
            lineHeight: 1.5,
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// FormActions — 폼 하단 버튼 영역
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {("right"|"left"|"split"|"center"|"full")} [props.align="right"]
 *   - right: 우측 정렬 (기본, 데스크톱 표준)
 *   - left: 좌측 정렬
 *   - split: 좌우 분리 (취소 좌측, 제출 우측)
 *   - center: 가운데
 *   - full: 모바일 — 풀폭 stack
 * @param {React.ReactNode} props.children
 */
export function FormActions({ align = "right", children, style, className }) {
  const alignStyles = {
    right: { justifyContent: "flex-end" },
    left: { justifyContent: "flex-start" },
    split: { justifyContent: "space-between" },
    center: { justifyContent: "center" },
    full: { flexDirection: "column", alignItems: "stretch" },
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        gap: 12,
        marginTop: 8,
        paddingTop: 24,
        borderTop: L.border,
        ...alignStyles[align],
        ...style,
      }}
    >
      {children}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// FormGroup — 인라인 필드 그룹 (예: 첫이름/성)
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {("equal"|"auto")} [props.layout="equal"] - 동일 너비 / 자동
 * @param {React.ReactNode} props.children
 */
export function FormGroup({ layout = "equal", children, style, className }) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: layout === "equal" ? "1fr 1fr" : "auto 1fr",
        gap: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// FormError — 폼 상단 에러 메시지 (서버 에러 등)
// ════════════════════════════════════════════════════════════════════

/**
 * @param {object} props
 * @param {string} props.message
 */
export function FormError({ message, style, className }) {
  if (!message) return null;

  return (
    <div
      className={className}
      style={{
        background: "#FEE2E2",
        border: `1px solid #DC2626`,
        borderRadius: L.rMd,
        padding: "12px 14px",
        fontSize: 13,
        color: "#7F1D1D",
        lineHeight: 1.5,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        ...style,
      }}
    >
      <span style={{ flexShrink: 0, fontWeight: 700 }}>⚠</span>
      <span>{message}</span>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════
// Validation 헬퍼 (간단한 검증 함수들)
// ════════════════════════════════════════════════════════════════════

export const validators = {
  required: (value) => {
    if (!value || (typeof value === "string" && !value.trim())) {
      return "필수 입력 항목입니다";
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "올바른 이메일 형식이 아닙니다";
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const digits = String(value).replace(/[^0-9]/g, "");
    if (digits.length < 10 || digits.length > 11) {
      return "전화번호는 10-11자리 숫자입니다";
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (String(value).length < min) {
      return `최소 ${min}자 이상 입력해주세요`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (String(value).length > max) {
      return `최대 ${max}자까지 입력 가능합니다`;
    }
    return null;
  },

  numberRange: (min, max) => (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    if (isNaN(n)) return "숫자를 입력해주세요";
    if (n < min) return `${min} 이상이어야 합니다`;
    if (n > max) return `${max} 이하여야 합니다`;
    return null;
  },

  // 한국 사업자등록번호 (10자리, 형식만 체크)
  businessNumber: (value) => {
    if (!value) return null;
    const digits = String(value).replace(/[^0-9]/g, "");
    if (digits.length !== 10) return "사업자등록번호는 10자리입니다";
    return null;
  },

  // 한국 시급 (최저시급 검증)
  minWage: (minWage = 9860) => (value) => {
    if (!value) return null;
    const n = Number(value);
    if (n < minWage) return `최저시급(${minWage.toLocaleString()}원) 이상이어야 합니다`;
    return null;
  },

  // 여러 검증 조합
  combine: (...validators) => (value) => {
    for (const v of validators) {
      const error = v(value);
      if (error) return error;
    }
    return null;
  },
};
