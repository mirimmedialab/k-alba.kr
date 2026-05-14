"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export function KakaoFloatingButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* 플로팅 카카오톡 CTA - Pill 형태 */}
      <a
        href="https://pf.kakao.com/_qTxouX"
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px 12px 12px",
          background: "#FEE500",
          borderRadius: 999,
          boxShadow: isHovered
            ? "0 12px 32px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(254, 229, 0, 0.4)"
            : "0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(254, 229, 0, 0.3)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          textDecoration: "none",
          cursor: "pointer",
        }}
        className="kakao-floating-cta"
      >
        {/* 카카오톡 아이콘 영역 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#3C1E1E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          <img
            src="/img/k-alba-logo.png"
            alt="K-ALBA"
            style={{ width: 48, height: 48 }}
          />
        </div>

        {/* 텍스트 영역 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
          className="kakao-cta-text"
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#3C1E1E",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            카카오톡으로 공고 등록부터 계약까지
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#3C1E1E",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            채널 열기
            <span style={{ fontSize: 13 }}>→</span>
          </div>
        </div>
      </a>

      {/* 반응형 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          .kakao-floating-cta {
            bottom: 16px !important;
            right: 16px !important;
            padding: 10px 16px 10px 10px !important;
            gap: 10px !important;
          }
          .kakao-cta-text div:first-child {
            font-size: 10px !important;
          }
          .kakao-cta-text div:last-child {
            font-size: 13px !important;
          }
        }
        @media (max-width: 480px) {
          .kakao-cta-text {
            display: none !important;
          }
          .kakao-floating-cta {
            padding: 0 !important;
            width: 72px !important;
            height: 72px !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </>
  );
}
