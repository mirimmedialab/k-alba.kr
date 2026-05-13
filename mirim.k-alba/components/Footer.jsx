"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * Footer — 전역 푸터
 *
 * 모든 페이지 하단에 표시되는 사업자 정보 및 저작권 표시
 * 데스크톱/모바일 반응형 디자인
 * Onboarding 페이지 흐름을 방해하지 않도록 경량화
 */
export default function Footer() {
  return (
    <footer
      style={{
        padding: "16px 20px 12px",
        background: T.paper,
        borderTop: `1px solid ${T.border}20`,
      }}
      className="global-footer"
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* 이용약관 및 개인정보처리방침 */}
        <div style={{ marginBottom: 8 }}>
          <Link
            href="/terms"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: T.ink3,
              textDecoration: "none",
              marginRight: 12,
              letterSpacing: "-0.01em",
              opacity: 0.7,
            }}
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: T.ink3,
              textDecoration: "none",
              letterSpacing: "-0.01em",
              opacity: 0.7,
            }}
          >
            개인정보처리방침
          </Link>
        </div>

        {/* 법적 정보 */}
        <div
          style={{
            fontSize: 9,
            color: T.ink3,
            lineHeight: 1.5,
            letterSpacing: "-0.01em",
            marginBottom: 6,
            opacity: 0.6,
          }}
        >
          K-ALBA | 대표: 남기환 | 사업자등록번호: 119-86-61402
          <br />
          직업정보제공사업 신고번호: J1204020260002 | 미림미디어랩 주식회사
        </div>
        <div
          style={{
            fontSize: 8,
            color: T.ink3,
            letterSpacing: "-0.01em",
            opacity: 0.5,
          }}
        >
          © 2026 K-ALBA. All rights reserved.
        </div>
      </div>

      {/* 모바일 추가 최소화 */}
      <style jsx>{`
        @media (max-width: 767px) {
          .global-footer {
            padding: 12px 20px 10px !important;
          }
        }
      `}</style>
    </footer>
  );
}
