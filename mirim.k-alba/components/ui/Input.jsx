"use client";
import { forwardRef, useState } from "react";
import { T, L, TYPE, SEMANTIC } from "@/lib/theme";

/**
 * Input 컴포넌트 (BI v2 Section 8.1)
 *
 * K-ALBA 표준 입력 필드. Text / Number / Date / Phone / Search 통합 지원.
 * 라벨, 도움말, 에러 메시지, 좌/우 아이콘, 클리어 버튼 등 포함.
 *
 * @param {object} props
 * @param {("text"|"number"|"date"|"tel"|"email"|"password"|"search")} [props.type="text"]
 * @param {("default"|"search"|"compact")} [props.variant="default"]
 *   - default: 라벨 위 + 입력 필드
 *   - search: 좌측 검색 아이콘 + 입력 (라벨 없이)
 *   - compact: 라벨/도움말 없이 작은 인풋만
 * @param {string} [props.label] - 위 라벨
 * @param {string} [props.hint] - 입력 아래 도움말
 * @param {string} [props.error] - 에러 메시지 (있으면 빨간 보더)
 * @param {string} [props.success] - 성공 메시지 (있으면 민트 보더)
 * @param {boolean} [props.required] - 필수 표시 (라벨 옆 *)
 * @param {boolean} [props.disabled]
 * @param {React.ReactNode} [props.iconLeft]
 * @param {React.ReactNode} [props.iconRight]
 * @param {boolean} [props.clearable] - 우측 X 버튼
 * @param {function} [props.onClear]
 * @param {("sm"|"md"|"lg")} [props.size="md"]
 * @param {object} [props.style]
 * @param {string} [props.className]
 *  ... 그 외 표준 input props (value, onChange, placeholder 등)
 *
 * @example
 *   <Input label="이름" placeholder="이름을 입력하세요" required />
 *   <Input label="시급" type="number" hint="최저시급 9,860원 이상" />
 *   <Input label="이메일" type="email" error="올바른 이메일이 아닙니다" />
 *   <Input variant="search" placeholder="알바 검색" iconLeft={<SearchIcon />} clearable />
 */
const Input = forwardRef(function Input({
  type = "text",
  variant = "default",
  label,
  hint,
  error,
  success,
  required,
  disabled,
  iconLeft,
  iconRight,
  clearable,
  onClear,
  size = "md",
  value,
  onChange,
  style,
  className,
  ...rest
}, ref) {
  const [focused, setFocused] = useState(false);

  // ────────── 사이즈 ──────────
  const sizeStyles = {
    sm: { padding: "8px 12px", fontSize: 13, borderRadius: L.rMd },
    md: { padding: "12px 14px", fontSize: 15, borderRadius: L.rMd },
    lg: { padding: "14px 16px", fontSize: 16, borderRadius: L.rLg },
  };

  // ────────── 보더 색상 (상태별) ──────────
  let borderColor = T.borderStrong;
  if (error) borderColor = SEMANTIC.error.color;
  else if (success) borderColor = SEMANTIC.success.color;
  else if (focused) borderColor = T.navy;

  // ────────── 좌측/우측 아이콘 패딩 보정 ──────────
  const inputPaddingLeft = iconLeft ? 40 : sizeStyles[size].padding.split(" ")[1];
  const inputPaddingRight = (iconRight || clearable) ? 40 : sizeStyles[size].padding.split(" ")[1];

  return (
    <div className={className} style={{ width: "100%", ...style }}>
      {/* 라벨 */}
      {label && variant !== "compact" && (
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

      {/* 입력 + 아이콘 컨테이너 */}
      <div style={{ position: "relative" }}>
        {/* 좌측 아이콘 */}
        {iconLeft && (
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.ink3,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {iconLeft}
          </div>
        )}

        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            border: `1px solid ${borderColor}`,
            borderRadius: sizeStyles[size].borderRadius,
            padding: sizeStyles[size].padding,
            paddingLeft: inputPaddingLeft,
            paddingRight: inputPaddingRight,
            fontSize: sizeStyles[size].fontSize,
            fontFamily: TYPE.family,
            background: disabled ? T.cream : T.paper,
            color: disabled ? T.ink3 : T.ink,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
            opacity: disabled ? 0.7 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
          {...rest}
        />

        {/* 우측 아이콘 또는 Clear 버튼 */}
        {clearable && value ? (
          <button
            type="button"
            onClick={() => onClear?.()}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: T.cream,
              color: T.ink3,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
            }}
            aria-label="Clear"
          >
            ×
          </button>
        ) : iconRight ? (
          <div
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.ink3,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}
          >
            {iconRight}
          </div>
        ) : null}
      </div>

      {/* 에러 / 성공 / 도움말 메시지 */}
      {(error || success || hint) && variant !== "compact" && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: error ? SEMANTIC.error.color : success ? SEMANTIC.success.color : T.ink3,
            lineHeight: 1.5,
          }}
        >
          {error || success || hint}
        </div>
      )}
    </div>
  );
});

export default Input;
