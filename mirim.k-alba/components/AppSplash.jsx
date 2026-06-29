"use client";
import { useEffect, useState } from "react";
import { TYPE } from "@/lib/theme";

/**
 * AppSplash — 네이티브 앱 전용 웹 스플래시 오버레이
 *
 * 네이티브 스플래시(저해상 PNG)는 화질/애니메이션 한계가 있어,
 * 웹앱이 로드되면 이 오버레이가 선명한(텍스트) 로고 위로 금빛 광택이 흐른 뒤 페이드아웃한다.
 *
 * - 네이티브 앱에서만 표시(웹은 영향 없음)
 * - 앱 세션당 1회(최초 로드)만 — 내부 페이지 이동/콜백 리로드에선 다시 안 뜸
 * - 배경 #0A1628 로 네이티브 스플래시와 같은 네이비 → 끊김 없이 이어짐
 */
function shouldShow() {
  if (typeof window === "undefined") return false;
  if (window.Capacitor?.isNativePlatform?.() !== true) return false;
  try {
    if (sessionStorage.getItem("kalba_splash_shown")) return false;
    sessionStorage.setItem("kalba_splash_shown", "1");
  } catch (_) {}
  return true;
}

export default function AppSplash() {
  const [show, setShow] = useState(shouldShow);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setLeaving(true), 1800); // 페이드 시작
    const t2 = setTimeout(() => setShow(false), 2400);   // 완전 제거
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#0A1628",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transition: "opacity 0.55s ease",
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      {/* 로고 — 우리 앱 폰트, 두꺼운 굵기, 금빛 그라데이션 + 금빛 광택 시머 */}
      <div
        style={{
          position: "relative",
          fontFamily: TYPE.family,
          fontWeight: 900,
          fontSize: "clamp(40px, 14vw, 68px)",
          letterSpacing: "-0.04em",
          background:
            "linear-gradient(120deg, #BF9648 0%, #F3E3B3 30%, #E8D9B5 50%, #BF9648 70%, #8C6E2E 100%)",
          backgroundSize: "250% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation:
            "kalbaShimmer 1.8s ease-in-out both, kalbaRise 0.7s cubic-bezier(0.2,0.8,0.2,1) both",
        }}
      >
        K-ALBA
      </div>

      <style>{`
        @keyframes kalbaShimmer {
          from { background-position: 160% 0; }
          to   { background-position: -60% 0; }
        }
        @keyframes kalbaRise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
