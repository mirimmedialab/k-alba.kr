"use client";
import Link from "next/link";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * Footer — 전역 푸터
 * 모바일: 경량(작게) / 데스크탑(>=1024px): 크고 진하게(3줄·구분선) 강조.
 * useIsDesktop 인라인 스타일로 크기를 직접 제어(스코핑 이슈 없이 확실히 적용).
 */
export default function Footer() {
  const t = useT();
  const d = useIsDesktop();

  const linkStyle = {
    fontSize: d ? 16 : 10,
    fontWeight: d ? 700 : 600,
    color: d ? T.navy : T.ink3,
    textDecoration: "none",
    letterSpacing: "-0.01em",
    opacity: d ? 1 : 0.7,
  };

  return (
    <footer
      style={{
        padding: d ? "32px 20px 28px" : "16px 20px 12px",
        background: T.paper,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
        {/* 1줄: 약관 · 개인정보 링크 */}
        <div style={{ marginBottom: d ? 12 : 8 }}>
          <Link href="/terms" style={linkStyle}>{t("siteFooter.terms")}</Link>
          <span style={{ margin: d ? "0 12px" : "0 8px", color: T.ink3, fontSize: d ? 15 : 10, opacity: 0.55 }}>|</span>
          <Link href="/privacy" style={linkStyle}>{t("siteFooter.privacy")}</Link>
        </div>

        {/* 2줄: 법적 정보 */}
        <div
          style={{
            fontSize: d ? 14 : 9,
            color: d ? T.ink2 : T.ink3,
            lineHeight: d ? 1.8 : 1.5,
            letterSpacing: "-0.01em",
            marginBottom: d ? 8 : 6,
            opacity: d ? 1 : 0.6,
          }}
        >
          K-ALBA | {t("siteFooter.ceo")}: 남기환 | {t("siteFooter.bizNo")}: 119-86-61402
          {d ? " | " : <br />}
          {t("siteFooter.jobInfoNo")}: J1204020260002 | {t("siteFooter.company")}
        </div>

        {/* 3줄: 저작권 */}
        <div
          style={{
            fontSize: d ? 12 : 8,
            color: T.ink3,
            letterSpacing: d ? "0.04em" : "-0.01em",
            opacity: d ? 0.8 : 0.5,
          }}
        >
          © 2026 K-ALBA. ALL RIGHTS RESERVED
        </div>
      </div>
    </footer>
  );
}
