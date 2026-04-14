"use client";
import { T } from "@/lib/theme";

export function Btn({ children, onClick, primary, full, small, disabled, type = "button", style }) {
  const base = {
    background: primary ? T.coral : "#fff",
    color: primary ? "#fff" : T.navy,
    border: primary ? "none" : `1.5px solid ${T.g200}`,
    padding: small ? "8px 14px" : "12px 24px",
    borderRadius: 12,
    fontSize: small ? 13 : 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    opacity: disabled ? 0.5 : 1,
    width: full ? "100%" : "auto",
    transition: "all 0.15s",
    ...style,
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={base}>
      {children}
    </button>
  );
}

export function Card({ children, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "16px 18px",
        border: `1px solid ${T.g200}`,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.15s",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Inp({ label, type = "text", placeholder, value, onChange, options, textarea }) {
  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: `2px solid ${T.g200}`,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 6 }}>
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
        <input type={type} value={value || ""} onChange={onChange} placeholder={placeholder} style={inputStyle} />
      )}
    </div>
  );
}

export function ChipSelect({ label, options, selected = [], setSelected }) {
  const toggle = (v) =>
    setSelected(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 8 }}>
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
                padding: "7px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                border: `1.5px solid ${active ? T.mint + "60" : T.g200}`,
                background: active ? T.mintL : "#fff",
                color: active ? "#059669" : T.g700,
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
