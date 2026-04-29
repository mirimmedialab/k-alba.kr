"use client";
import { useState, useRef, useEffect } from "react";
import { T } from "@/lib/theme";
import { LOCALES, useLocale, useT } from "@/lib/i18n";

/**
 * LanguageSwitcher
 *
 * 7개 언어 드롭다운. 화면 우측 NavBar 또는 페이지 안에 배치.
 *
 * 화면 위치 자동 보정:
 *   드롭다운이 화면 밖으로 나갈 위험이 있으면 좌/우 정렬 자동 전환.
 *   특히 모바일에서 좁은 화면 폭 + 작은 버튼 조합일 때 필수.
 */
export function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(true); // true=right:0, false=left:0
  const ref = useRef(null);

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 드롭다운 열릴 때 뷰포트 경계 검사
  useEffect(() => {
    if (!open || !ref.current) return;
    const btnRect = ref.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = 200; // 대략적인 드롭다운 폭

    // right:0 으로 정렬했을 때 드롭다운의 왼쪽 가장자리
    const rightAlignedLeft = btnRect.right - dropdownWidth;
    // left:0 으로 정렬했을 때 드롭다운의 오른쪽 가장자리
    const leftAlignedRight = btnRect.left + dropdownWidth;

    if (rightAlignedLeft < 8) {
      // right:0이면 화면 왼쪽 밖으로 나감 → left:0으로 전환
      setAlignRight(false);
    } else if (leftAlignedRight > viewportWidth - 8) {
      // left:0이면 화면 오른쪽 밖으로 나감 → right:0 유지
      setAlignRight(true);
    } else {
      // 양쪽 다 OK이면 right:0 (기본 우측 정렬)
      setAlignRight(true);
    }
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
            // 뷰포트 경계 검사 결과에 따라 좌/우 정렬
            ...(alignRight ? { right: 0 } : { left: 0 }),
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
