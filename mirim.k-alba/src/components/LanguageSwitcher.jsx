"use client";
import { useState, useRef, useEffect } from "react";
import { T } from "@/lib/theme";
import { LOCALES, useLocale, useT } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = LOCALES[locale];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "#fff",
          border: `1.5px solid ${T.g200}`,
          borderRadius: 10,
          padding: compact ? "6px 10px" : "8px 12px",
          fontSize: compact ? 12 : 13,
          fontWeight: 600,
          color: T.navy,
          cursor: "pointer",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: compact ? 14 : 16 }}>{current.flag}</span>
        {!compact && <span>{current.name}</span>}
        <span style={{ fontSize: 9, color: T.g500, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            border: `1px solid ${T.g200}`,
            minWidth: 180,
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${T.g100}`, fontSize: 11, fontWeight: 700, color: T.g500, letterSpacing: 1 }}>
            {t("language.select")}
          </div>
          {Object.entries(LOCALES).map(([code, info]) => (
            <button
              key={code}
              onClick={() => {
                setLocale(code);
                setOpen(false);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: code === locale ? T.mintL : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: code === locale ? 700 : 500,
                color: code === locale ? "#059669" : T.navy,
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (code !== locale) e.currentTarget.style.background = T.g100;
              }}
              onMouseLeave={(e) => {
                if (code !== locale) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: 16 }}>{info.flag}</span>
              <span>{info.name}</span>
              {code === locale && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
