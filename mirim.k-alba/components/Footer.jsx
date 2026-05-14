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
        }}
      >
        {/* 이용약관 및 개인정보처리방침 */}
        <div style={{ marginBottom: 8, textAlign: "center" }} className="footer-links">
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

        {/* 첫 번째 줄: 회사명 (좌) + 저작권 (우) */}
        <div
          className="footer-top"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 9,
            color: T.ink3,
            letterSpacing: "-0.01em",
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          <span>미림미디어랩 주식회사</span>
          <span>© 2026 K-ALBA. All rights reserved.</span>
        </div>

        {/* 두 번째 줄: 법적 정보 (중앙 정렬) */}
        <div
          className="footer-bottom"
          style={{
            fontSize: 8,
            color: T.ink3,
            letterSpacing: "-0.01em",
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          대표: 남기환 | 사업자등록번호: 119-86-61402 | 직업정보제공사업 신고번호: J1204020260002 | 주소: 서울특별시 관악구 남부순환로 1820, 에그옐로우 A동 406호
        </div>
      </div>

      {/* 반응형 조정 */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .footer-links a {
            font-size: 12px !important;
          }
          .footer-top {
            font-size: 11px !important;
          }
          .footer-bottom {
            font-size: 10px !important;
          }
        }
        @media (max-width: 767px) {
          .global-footer {
            padding: 12px 20px 10px !important;
          }
          .footer-top {
            flex-direction: column;
            gap: 2px;
            text-align: center;
          }
          .footer-bottom {
            font-size: 7px !important;
            line-height: 1.4;
          }
        }
      `}</style>
    </footer>
  );
}
