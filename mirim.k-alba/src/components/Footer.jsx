"use client";
import Link from "next/link";
import { T } from "@/lib/theme";

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 60,
        padding: "28px 20px 32px",
        borderTop: `1px solid ${T.g200}`,
        background: T.g100,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {/* 로고 + 소개 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.coral, marginBottom: 4 }}>
            K-ALBA
          </div>
          <div style={{ fontSize: 12, color: T.g500 }}>
            한국의 외국인을 위한 알바 플랫폼
          </div>
        </div>

        {/* 링크 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <Link
            href="/privacy"
            style={{
              color: T.navy,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: T.g300 }}>|</span>
          <Link
            href="/terms"
            style={{
              color: T.g500,
              textDecoration: "none",
            }}
          >
            이용약관
          </Link>
          <span style={{ color: T.g300 }}>|</span>
          <a
            href="mailto:mirimmedialab@gmail.com"
            style={{
              color: T.g500,
              textDecoration: "none",
            }}
          >
            문의하기
          </a>
        </div>

        {/* 회사 정보 */}
        <div style={{ fontSize: 11, color: T.g500, lineHeight: 1.7 }}>
          <div>미림미디어랩 주식회사 | 대표: 남기환</div>
          <div>이메일: mirimmedialab@gmail.com</div>
          <div style={{ marginTop: 8 }}>© 2026 K-ALBA. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
