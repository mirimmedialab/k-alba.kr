"use client";
import { T } from "@/lib/theme";

/**
 * UI 공용 컴포넌트 — McKinsey 에디토리얼 스타일로 재디자인
 *
 * 변경점 (기존 coral/mint 스타일 → 네이비/골드):
 *   - border-radius: 12~14px → 4~6px (샤프)
 *   - primary 버튼: 코랄 → 네이비(#0A1628)
 *   - 입력 border: 2px → 1px (얇게)
 *   - 전반적으로 letter-spacing -0.01em (타이틀은 더 타이트)
 */

export function Btn({
  children,
  onClick,
  primary,
  full,
  small,
  disabled,
  type = "button",
  style,
  variant, // "dark" | "gold" | "ghost" | undefined (default = outlined)
}) {
  // Primary === dark navy (랜딩 페이지 CTA와 일관성)
  let base = {};

  if (primary || variant === "dark") {
    base = {
      background: T.n9,
      color: T.paper,
      border: "1px solid transparent",
    };
  } else if (variant === "gold") {
    base = {
      background: T.gold,
      color: T.n9,
      border: "1px solid transparent",
    };
  } else if (variant === "ghost") {
    base = {
      background: "transparent",
      color: T.ink,
      border: "none",
    };
  } else {
    // default: outlined
    base = {
      background: T.paper,
      color: T.ink,
      border: `1px solid ${T.border}`,
    };
  }

  const sizing = small
    ? { padding: "7px 14px", fontSize: 13 }
    : { padding: "11px 20px", fontSize: 14 };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...sizing,
        borderRadius: 4,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto",
        transition: "all 0.15s",
        letterSpacing: "-0.01em",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Card({ children, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.paper,
        borderRadius: 6,
        padding: "16px 18px",
        border: `1px solid ${T.border}`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Inp({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  options,
  textarea,
}) {
  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    letterSpacing: "-0.01em",
    color: T.ink,
    background: T.paper,
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ marginBottom: 14 }}>
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
        </label>
      )}
      {textarea ? (
        <textarea
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        />
      ) : options ? (
        <select value={value || ""} onChange={onChange} style={inputStyle}>
          <option value="">선택해 주세요</option>
          {options.map((o) => {
            const v = typeof o === "string" ? o : o.v;
            const l = typeof o === "string" ? o : o.l;
            return (
              <option key={v} value={v}>
                {l}
              </option>
            );
          })}
        </select>
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

export function ChipSelect({ label, options, selected = [], setSelected }) {
  const toggle = (v) =>
    setSelected(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    );
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                border: `1px solid ${active ? T.n9 : T.border}`,
                background: active ? T.n9 : T.paper,
                color: active ? T.gold : T.ink2,
                letterSpacing: "-0.01em",
              }}
            >
              {active ? "✓ " : ""}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
