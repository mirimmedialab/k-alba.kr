"use client";
import { useState } from "react";
import { T } from "@/lib/theme";

export function KakaoFloatingButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 48,
        right: 38,
        zIndex: 1000,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="kakao-floating-container"
    >
      {/* 겹침 구조: 말풍선 + 버튼 */}
      <div style={{ position: "relative" }}>
        {/* 말풍선 카드 */}
        <a
          href="https://pf.kakao.com/_qTxouX"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            position: "relative",
            top: -5,
            background: "#FFFFFF",
            borderRadius: 20,
            padding: "14px 20px",
            paddingRight: 50,
            boxShadow: isHovered
              ? "0 16px 40px rgba(0, 0, 0, 0.16)"
              : "0 10px 30px rgba(0, 0, 0, 0.12)",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isHovered ? "translateY(-6px)" : "translateY(0)",
            opacity: isHovered ? 1 : 0,
            pointerEvents: isHovered ? "auto" : "none",
            textDecoration: "none",
            cursor: "pointer",
          }}
          className="kakao-speech-bubble"
        >
          {/* 첫 줄: 아이콘 + "카카오톡으로" */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#FEE500",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3C6.477 3 2 6.58 2 11c0 2.79 1.91 5.23 4.76 6.53-.2.73-.66 2.43-.76 2.82-.12.47.17.46.37.33.15-.09 2.49-1.67 3.45-2.32.39.05.79.08 1.18.08 5.523 0 10-3.58 10-8S17.523 3 12 3z"
                  fill="#3C1E1E"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#1A1A1A",
                letterSpacing: "-0.03em",
              }}
            >
              카카오톡으로
            </span>
          </div>

          {/* 둘째 줄: "공고 등록부터 계약까지" */}
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#1A1A1A",
              lineHeight: 1.5,
              letterSpacing: "-0.03em",
              marginBottom: 10,
              marginLeft: 42,
            }}
          >
            공고 등록부터 계약까지
          </div>

          {/* 채널 열기 버튼 */}
          <div
            style={{
              background: "#FEE500",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 800,
              color: "#3C1E1E",
              letterSpacing: "-0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 42,
            }}
          >
            채널 열기
            <span style={{ fontSize: 12 }}>→</span>
          </div>
        </a>

        {/* 원형 버튼 - 말풍선 오른쪽 하단 모서리를 침범하여 겹침 */}
        <a
          href="https://pf.kakao.com/_qTxouX"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "absolute",
            right: -18,
            bottom: -18,
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#FEE500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isHovered
              ? "0 12px 32px rgba(0, 0, 0, 0.18)"
              : "0 8px 24px rgba(0, 0, 0, 0.14)",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isHovered ? "translateY(-6px) scale(1.08)" : "translateY(0) scale(1)",
            textDecoration: "none",
            cursor: "pointer",
            zIndex: 10,
          }}
          className="kakao-circle-button"
        >
          <img
            src="/img/k-alba-logo.png"
            alt="K-ALBA"
            style={{ width: 52, height: 52, marginTop: 8 }}
          />
        </a>
      </div>

      {/* 반응형 스타일 */}
      <style jsx>{`
        @media (max-width: 768px) {
          .kakao-floating-container {
            bottom: 20px !important;
            right: 20px !important;
          }
        }
        @media (max-width: 480px) {
          .kakao-speech-bubble {
            display: none !important;
          }
          .kakao-circle-button {
            position: fixed !important;
            right: 20px !important;
            bottom: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
