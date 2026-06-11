"use client";
import { useState, useRef, useEffect } from "react";
import { T, L, TYPE, SEMANTIC } from "@/lib/theme";

/**
 * Select 컴포넌트 (BI v2 Section 8.1)
 *
 * 단일 선택 / 다중 선택 / 검색 가능한 드롭다운.
 *
 * @param {object} props
 * @param {Array<{value: string, label: string, icon?: ReactNode, disabled?: boolean}>} props.options
 * @param {string|string[]} [props.value] - 선택된 값 (단일: string, 다중: string[])
 * @param {function} props.onChange - (value) => void
 * @param {("single"|"multi")} [props.mode="single"]
 * @param {boolean} [props.searchable] - 검색 입력 표시
 * @param {string} [props.placeholder="선택해주세요"]
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 * @param {("sm"|"md"|"lg")} [props.size="md"]
 * @param {object} [props.style]
 * @param {string} [props.className]
 *
 * @example
 *   <Select
 *     label="비자 유형"
 *     options={[
 *       { value: "E-9", label: "E-9 비전문취업" },
 *       { value: "D-2", label: "D-2 유학" },
 *     ]}
 *     value={visa}
 *     onChange={setVisa}
 *   />
 *
 *   <Select mode="multi" options={...} value={selected} onChange={setSelected} />
 */
export default function Select({
  options = [],
  value,
  onChange,
  mode = "single",
  searchable = false,
  placeholder = "선택해주세요",
  label,
  hint,
  error,
  required,
  disabled,
  size = "md",
  style,
  className,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  // 외부 클릭 감지
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ────────── 사이즈 ──────────
  const sizeStyles = {
    sm: { padding: "8px 12px", fontSize: 13, borderRadius: L.rMd },
    md: { padding: "12px 14px", fontSize: 15, borderRadius: L.rMd },
    lg: { padding: "14px 16px", fontSize: 16, borderRadius: L.rLg },
  };

  // ────────── 검색 필터 ──────────
  const filtered = searchable && search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  // ────────── 선택 표시 텍스트 ──────────
  let displayText = placeholder;
  let isPlaceholder = true;

  if (mode === "single" && value) {
    const selected = options.find((o) => o.value === value);
    if (selected) {
      displayText = selected.label;
      isPlaceholder = false;
    }
  } else if (mode === "multi" && Array.isArray(value) && value.length > 0) {
    displayText = `${value.length}개 선택됨`;
    isPlaceholder = false;
  }

  // ────────── 선택/해제 ──────────
  const handleSelect = (optValue) => {
    if (mode === "single") {
      onChange?.(optValue);
      setOpen(false);
      setSearch("");
    } else {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      onChange?.(next);
    }
  };

  const isSelected = (optValue) => {
    if (mode === "single") return value === optValue;
    return Array.isArray(value) && value.includes(optValue);
  };

  return (
    <div className={className} style={{ width: "100%", ...style }} ref={ref}>
      {/* 라벨 */}
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

      {/* 트리거 버튼 */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          style={{
            width: "100%",
            border: `1px solid ${error ? SEMANTIC.error.color : open ? T.navy : T.borderStrong}`,
            borderRadius: sizeStyles[size].borderRadius,
            padding: sizeStyles[size].padding,
            fontSize: sizeStyles[size].fontSize,
            fontFamily: TYPE.family,
            background: disabled ? T.cream : T.paper,
            color: isPlaceholder ? T.ink3 : T.ink,
            textAlign: "left",
            cursor: disabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            opacity: disabled ? 0.7 : 1,
            transition: "border-color 0.15s",
          }}
        >
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayText}
          </span>
          <span
            style={{
              fontSize: 11,
              color: T.ink3,
              transition: "transform 0.15s",
              transform: open ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            ▼
          </span>
        </button>

        {/* 드롭다운 */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: T.paper,
              border: L.border,
              borderRadius: L.rLg,
              boxShadow: L.shadowLg,
              maxHeight: 280,
              overflow: "hidden",
              zIndex: 100,
            }}
          >
            {/* 검색 입력 */}
            {searchable && (
              <div style={{ padding: 8, borderBottom: L.border }}>
                <input
                  type="text"
                  placeholder="검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: 13,
                    fontFamily: TYPE.family,
                    border: `1px solid ${T.border}`,
                    borderRadius: L.rMd,
                    outline: "none",
                    color: T.ink,
                    background: T.paper,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            {/* 옵션 목록 */}
            <div style={{ maxHeight: 224, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: T.ink3, textAlign: "center" }}>
                  결과가 없습니다
                </div>
              ) : (
                filtered.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    style={{
                      padding: "10px 14px",
                      fontSize: 14,
                      fontFamily: TYPE.family,
                      color: opt.disabled ? T.ink3 : T.ink,
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                      background: isSelected(opt.value) ? T.coralL : "transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: opt.disabled ? 0.5 : 1,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!opt.disabled && !isSelected(opt.value)) {
                        e.currentTarget.style.background = T.cream;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected(opt.value)) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {/* 다중 선택 체크박스 */}
                    {mode === "multi" && (
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: `1.5px solid ${isSelected(opt.value) ? T.coral : T.borderStrong}`,
                          borderRadius: 4,
                          background: isSelected(opt.value) ? T.coral : "transparent",
                          color: T.paper,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          flexShrink: 0,
                        }}
                      >
                        {isSelected(opt.value) && "✓"}
                      </span>
                    )}

                    {opt.icon && (
                      <span style={{ display: "inline-flex" }}>{opt.icon}</span>
                    )}

                    <span style={{ flex: 1 }}>{opt.label}</span>

                    {/* 단일 선택 체크 */}
                    {mode === "single" && isSelected(opt.value) && (
                      <span style={{ color: T.coral, fontSize: 14 }}>✓</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 에러 / 도움말 */}
      {(error || hint) && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: error ? SEMANTIC.error.color : T.ink3,
            lineHeight: 1.5,
          }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
