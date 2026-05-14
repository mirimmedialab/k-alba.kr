"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export function KakaoFloatingButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 툴팁 - 강화된 CTA 메시지 */}
      <div
        style={{
          position: "absolute",
          right: 85,
          top: "50%",
          transform: `translateY(-50%) translateX(${showTooltip ? "0" : "10px"})`,
          opacity: showTooltip ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
          background: "#3C1E1E",
          color: "#FEE500",
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 700,
          whiteSpace: "nowrap",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
          border: "2px solid #FEE500",
        }}
      >
        💬 카톡으로 간편하게 구인·구직 시작하기
        {/* 말풍선 꼬리 */}
        <div
          style={{
            position: "absolute",
            right: -8,
            top: "50%",
            transform: "translateY(-50%) rotate(45deg)",
            width: 14,
            height: 14,
            background: "#3C1E1E",
            border: "2px solid #FEE500",
            borderLeft: "none",
            borderBottom: "none",
          }}
        />
      </div>

      {/* 플로팅 버튼 - 확대 & 강화 */}
      <a
        href="https://pf.kakao.com/_qTxouX"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 70,
          height: 70,
          background: "#FEE500",
          borderRadius: "50%",
          boxShadow: "0 6px 24px rgba(254, 229, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          textDecoration: "none",
          border: "3px solid #3C1E1E",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(254, 229, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(254, 229, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)";
        }}
      >
        {/* K-ALBA 로고 */}
        <img
          src="/img/k-alba-logo.png"
          alt="K-ALBA 카카오톡"
          style={{ width: 48, height: 48 }}
        />
      </a>

      {/* 모바일 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          div:first-child {
            bottom: 16px !important;
            right: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
