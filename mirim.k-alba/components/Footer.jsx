"use client";
import { T } from "@/lib/theme";

/**
 * Footer — 전역 푸터
 *
 * 모든 페이지 하단에 표시되는 사업자 정보 및 저작권 표시
 * 데스크톱/모바일 반응형 디자인
 */
export default function Footer() {
  return (
    <footer
      style={{
        padding: "40px 20px",
        background: T.paper,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* 법적 정보 */}
        <div
          style={{
            fontSize: 13,
            color: T.ink3,
            lineHeight: 1.8,
            letterSpacing: "-0.01em",
            marginBottom: 12,
          }}
        >
          K-ALBA | 대표: 남기환 | 사업자등록번호: 119-86-61402 | 직업정보제공사업 신고번호: J1204020260002 | 미림미디어랩 주식회사
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.g500,
            letterSpacing: "-0.01em",
          }}
        >
          © 2026 K-ALBA. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
