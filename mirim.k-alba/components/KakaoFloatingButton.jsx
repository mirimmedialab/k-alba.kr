"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export function KakaoFloatingButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="kakao-floating-container"
    >
      {/* 말풍선 카드 */}
      <a
        href="https://pf.kakao.com/_qTxouX"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: 16,
          padding: "18px 22px",
          boxShadow: isHovered
            ? "0 12px 32px rgba(0, 0, 0, 0.15)"
            : "0 8px 24px rgba(0, 0, 0, 0.1)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          textDecoration: "none",
          cursor: "pointer",
          minWidth: 240,
        }}
        className="kakao-speech-bubble"
      >
        {/* 첫 줄: 아이콘 + "카카오톡으로" */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#FEE500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3C6.477 3 2 6.58 2 11c0 2.79 1.91 5.23 4.76 6.53-.2.73-.66 2.43-.76 2.82-.12.47.17.46.37.33.15-.09 2.49-1.67 3.45-2.32.39.05.79.08 1.18.08 5.523 0 10-3.58 10-8S17.523 3 12 3z"
                fill="#3C1E1E"
              />
            </svg>
          </div>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#1A1A1A",
              letterSpacing: "-0.02em",
            }}
          >
            카카오톡으로
          </span>
        </div>

        {/* 둘째 줄: "공고 등록부터 계약까지" */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#1A1A1A",
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
            marginBottom: 12,
            marginLeft: 36,
          }}
        >
          공고 등록부터 계약까지
        </div>

        {/* 채널 열기 버튼 (작게) */}
        <div
          style={{
            background: "#FEE500",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 800,
            color: "#3C1E1E",
            letterSpacing: "-0.01em",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginLeft: 36,
          }}
        >
          채널 열기
          <span style={{ fontSize: 12 }}>→</span>
        </div>

        {/* 말풍선 꼬리 (오른쪽 하단) */}
        <div
          style={{
            position: "absolute",
            right: -8,
            bottom: 24,
            width: 0,
            height: 0,
            borderLeft: "16px solid #FFFFFF",
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            filter: "drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.05))",
          }}
        />
      </a>

      {/* 동그라미 카카오톡 버튼 */}
      <a
        href="https://pf.kakao.com/_qTxouX"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "#FEE500",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "translateY(-4px) scale(1.05)" : "translateY(0) scale(1)",
          flexShrink: 0,
          textDecoration: "none",
          cursor: "pointer",
        }}
        className="kakao-circle-button"
      >
        <img
          src="/img/k-alba-logo.png"
          alt="K-ALBA"
          style={{ width: 48, height: 48 }}
        />
      </a>

      {/* 반응형 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          .kakao-floating-container {
            bottom: 16px !important;
            right: 16px !important;
          }
          .kakao-speech-bubble {
            max-width: 240px !important;
            padding: 16px 20px !important;
          }
        }
        @media (max-width: 480px) {
          .kakao-speech-bubble {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
