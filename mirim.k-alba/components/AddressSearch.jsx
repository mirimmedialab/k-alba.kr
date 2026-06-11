"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";

// Daum Postcode 스크립트 로더
let scriptLoading = null;
function loadDaumScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  // ✅ 이미 로드된 경우 즉시 resolve
  if (window.daum && window.daum.Postcode) return Promise.resolve(true);
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="postcode"]');
    if (existing) {
      // ✅ 이미 로드 완료됐을 수도 있으니 체크
      if (window.daum && window.daum.Postcode) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => {
        scriptLoading = null; // 재시도 가능하도록
        resolve(false);
      });
      // ✅ 타임아웃 추가 (이벤트가 이미 발생했을 경우 대비)
      setTimeout(() => {
        if (window.daum && window.daum.Postcode) resolve(true);
        else {
          scriptLoading = null;
          resolve(false);
        }
      }, 5000);
      return;
    }
    const s = document.createElement("script");
    s.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => {
      scriptLoading = null; // 재시도 가능하도록
      resolve(false);
    };
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export function AddressSearchModal({ open, onClose, onSelect }) {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    setError(false);
    setLoaded(false);
    loadDaumScript().then((ok) => {
      setLoaded(ok);
      if (!ok) {
        setError(true);
        return;
      }
      if (!containerRef.current || !window.daum?.Postcode) {
        setError(true);
        return;
      }
      containerRef.current.innerHTML = "";
      try {
        new window.daum.Postcode({
          oncomplete: (data) => {
            const road = data.roadAddress || data.jibunAddress;
            const building = data.buildingName ? ` (${data.buildingName})` : "";
            onSelect(road + building);
            onClose();
          },
          width: "100%",
          height: "100%",
          maxSuggestItems: 5,
        }).embed(containerRef.current);
      } catch (e) {
        console.error("Daum Postcode init failed:", e);
        setError(true);
      }
    });
  }, [open, onClose, onSelect]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500,
          height: 560, overflow: "hidden", display: "flex", flexDirection: "column",
        }}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.g200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: "#FEE500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📍</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.navy }}>{t("address.search")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: T.g500, cursor: "pointer", padding: 4 }}>✕</button>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          {!loaded && !error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${T.g200}`, borderTopColor: T.coral, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 13, color: T.g500 }}>{t("address.loading")}</div>
            </div>
          )}
          {error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 20 }}>
              <div style={{ fontSize: 32 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.navy }}>{t("address.error.title")}</div>
              <div style={{ fontSize: 12, color: T.g500, textAlign: "center", lineHeight: 1.6 }}>{t("address.error.desc")}</div>
            </div>
          )}
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

export function AddressSearchField({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: T.navy, marginBottom: 6 }}>
          {label || t("address.label")}
        </label>
        <div
          onClick={() => setOpen(true)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 12,
            border: `2px solid ${value ? T.mint : T.g200}`,
            fontSize: 14, fontFamily: "inherit",
            color: value ? T.navy : T.g500, background: "#fff", cursor: "pointer",
            display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box",
          }}
        >
          <span>{value || t("address.placeholder")}</span>
          <span style={{ fontSize: 12, color: T.mint, fontWeight: 600 }}>🔍 {t("address.searchBtn")}</span>
        </div>
      </div>
      <AddressSearchModal open={open} onClose={() => setOpen(false)} onSelect={onChange} />
    </>
  );
}
