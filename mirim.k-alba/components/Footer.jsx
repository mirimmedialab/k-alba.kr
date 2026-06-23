"use client";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";

/**
 * Footer — 전역 푸터
 *
 * 모든 페이지 하단에 표시되는 사업자 정보 및 저작권 표시.
 * 모바일은 경량(작게) 유지, 데스크탑(>=1024px)에서만 크고 진하게(3줄·구분선) 강조.
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
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        {/* 1줄: 약관 · 개인정보 링크 */}
        <div style={{ marginBottom: 8 }} className="footer-links">
          <Link
            href="/terms"
            style={{ fontSize: 10, fontWeight: 600, color: T.ink3, textDecoration: "none", marginRight: 12, letterSpacing: "-0.01em", opacity: 0.7 }}
          >
            {t("siteFooter.terms")}
          </Link>
          <span className="footer-sep" style={{ display: "none", color: T.ink3, marginRight: 12 }}>|</span>
          <Link
            href="/privacy"
            style={{ fontSize: 10, fontWeight: 600, color: T.ink3, textDecoration: "none", letterSpacing: "-0.01em", opacity: 0.7 }}
          >
            {t("siteFooter.privacy")}
          </Link>
        </div>

        {/* 2줄: 법적 정보 */}
        <div
          className="footer-legal"
          style={{ fontSize: 9, color: T.ink3, lineHeight: 1.5, letterSpacing: "-0.01em", marginBottom: 6, opacity: 0.6 }}
        >
          K-ALBA | {t("siteFooter.ceo")}: 남기환 | {t("siteFooter.bizNo")}: 119-86-61402<span className="footer-pipe" style={{ display: "none" }}> | </span>
          <br className="footer-br" />
          {t("siteFooter.jobInfoNo")}: J1204020260002 | {t("siteFooter.company")}
        </div>

        {/* 3줄: 저작권 */}
        <div
          className="footer-copyright"
          style={{ fontSize: 8, color: T.ink3, letterSpacing: "-0.01em", opacity: 0.5 }}
        >
          © 2026 K-ALBA. ALL RIGHTS RESERVED
        </div>
      </div>

      {/* 반응형: 데스크탑에서만 강조 (모바일 미변경) */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .global-footer {
            padding: 32px 20px 28px !important;
          }
          .footer-links a {
            font-size: 15px !important;
            font-weight: 700 !important;
            color: #3f5273 !important;
            opacity: 1 !important;
          }
          .footer-sep {
            display: inline-block !important;
            font-size: 14px !important;
            color: #6b7a95 !important;
            opacity: 0.6 !important;
          }
          .footer-legal {
            font-size: 13px !important;
            color: #3f5273 !important;
            opacity: 0.9 !important;
            margin-bottom: 8px !important;
            line-height: 1.7 !important;
          }
          .footer-pipe {
            display: inline !important;
          }
          .footer-br {
            display: none !important;
          }
          .footer-copyright {
            font-size: 12px !important;
            color: #6b7a95 !important;
            opacity: 0.75 !important;
            letter-spacing: 0.04em !important;
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
