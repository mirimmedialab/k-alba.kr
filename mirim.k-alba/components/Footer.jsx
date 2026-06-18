"use client";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";

/**
 * Footer — 전역 푸터
 *
 * 모든 페이지 하단에 표시되는 사업자 정보 및 저작권 표시
 * 데스크톱/모바일 반응형 디자인
 * Onboarding 페이지 흐름을 방해하지 않도록 경량화
 */
export default function Footer() {
  const t = useT();
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
        <div style={{ marginBottom: 8 }} className="footer-links">
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
            {t("siteFooter.terms")}
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
            {t("siteFooter.privacy")}
          </Link>
        </div>

        {/* 법적 정보 */}
        <div
          className="footer-legal"
          style={{
            fontSize: 9,
            color: T.ink3,
            lineHeight: 1.5,
            letterSpacing: "-0.01em",
            marginBottom: 6,
            opacity: 0.6,
          }}
        >
          K-ALBA | {t("siteFooter.ceo")}: 남기환 | {t("siteFooter.bizNo")}: 119-86-61402
          <br />
          {t("siteFooter.jobInfoNo")}: J1204020260002 | {t("siteFooter.company")}
        </div>
        <div
          className="footer-copyright"
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

      {/* 반응형 조정 */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .footer-links a {
            font-size: 12px !important;
          }
          .footer-legal {
            font-size: 11px !important;
          }
          .footer-copyright {
            font-size: 10px !important;
          }
        }
        @media (max-width: 767px) {
          .global-footer {
            padding: 12px 20px 10px !important;
          }
        }
      `}</style>
    </footer>
  );
}
