"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export function KakaoFloatingButton() {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 30,
        right: 30,
        zIndex: 1000,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* 툴팁 */}
      <div
        style={{
          position: "absolute",
          right: 70,
          top: "50%",
          transform: `translateY(-50%) translateX(${showTooltip ? "0" : "10px"})`,
          opacity: showTooltip ? 1 : 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
          background: T.n9,
          color: T.paper,
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        카카오톡 상담
        {/* 말풍선 꼬리 */}
        <div
          style={{
            position: "absolute",
            right: -6,
            top: "50%",
            transform: "translateY(-50%) rotate(45deg)",
            width: 12,
            height: 12,
            background: T.n9,
          }}
        />
      </div>

      {/* 플로팅 버튼 */}
      <a
        href="https://pf.kakao.com/_qTxouX"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 60,
          height: 60,
          background: "#FEE500",
          borderRadius: "50%",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.15)";
        }}
      >
        {/* K-ALBA 로고 */}
        <img
          src="/img/k-alba-logo.png"
          alt="K-ALBA"
          style={{ width: 44, height: 44 }}
        />
      </a>

      {/* 모바일 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          div:first-child {
            bottom: 20px !important;
            right: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
