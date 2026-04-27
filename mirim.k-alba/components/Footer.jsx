"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

/**
 * Footer — 웹 랜딩 페이지와 동일한 네이비 배경 스타일
 */
export default function Footer() {
  return (
    <footer
      style={{
        padding: "28px 20px",
        background: T.n9,
        borderTop: "1px solid rgba(232,217,181,0.15)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* 브랜드 */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: T.paper,
          }}
        >
          K‑ALBA
        </div>

        {/* 링크 */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 18,
            fontSize: 13,
          }}
        >
          <Link
            href="/privacy"
            style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
          >
            개인정보처리방침
          </Link>
          <Link
            href="/terms"
            style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
          >
            이용약관
          </Link>
          <a
            href="mailto:mirimmedialab@gmail.com"
            style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
          >
            contact@k-alba.kr
          </a>
        </div>

        {/* 회사 정보 */}
        <div
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
          }}
        >
          <div>© 2026 미림미디어랩 주식회사 · 대표 남기환</div>
          <div style={{ marginTop: 2 }}>사업자등록번호 · k-alba.kr</div>
        </div>
      </div>
    </footer>
  );
}
