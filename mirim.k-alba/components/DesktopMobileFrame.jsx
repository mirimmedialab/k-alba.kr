"use client";
import { useEffect, useState } from "react";

/**
 * DesktopMobileFrame
 *
 * 데스크톱 사용자가 서비스 페이지(/login, /jobs 등)에 접근했을 때:
 *   - 가운데에 모바일 UI를 480px 폭으로 표시
 *   - 좌우 영역에 "휴대폰으로 접속하세요" 안내 + QR 코드 + 카카오톡 채널 안내
 *
 * 모바일 디바이스에서는 wrapper가 비활성화되어 자식을 그대로 풀스크린 렌더.
 *
 * 사용:
 *   <DesktopMobileFrame>
 *     <서비스 페이지 콘텐츠 />
 *   </DesktopMobileFrame>
 *
 * 동작:
 *   - SSR: 기본은 풀스크린 (모바일 UA 가정) — hydration mismatch 방지
 *   - 클라이언트 마운트 후: window.innerWidth 검사하여 데스크톱이면 wrapper 활성화
 */
export default function DesktopMobileFrame({ children }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const check = () => {
      // 1024px 이상은 데스크톱으로 간주 (태블릿 가로/노트북 이상)
      setIsDesktop(window.innerWidth >= 1024);
    };
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 마운트 전 또는 모바일: wrapper 없이 그대로
  if (!mounted || !isDesktop) {
    return <>{children}</>;
  }

  // 데스크톱: 가운데 480px + 좌우 안내
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F7F5F0 0%, #FFFDFB 100%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        gap: 60,
      }}
    >
      {/* ── 좌측: 브랜드 안내 ── */}
      <aside
        style={{
          flex: "0 0 280px",
          position: "sticky",
          top: 40,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #FF6B5A, #FF8A7A)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 900,
              fontSize: 16,
            }}
          >
            K
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#1A1F3D" }}>
            K-<span style={{ color: "#FF6B5A" }}>ALBA</span>
          </div>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "#4A4640" }}>
          한국의 모든 외국인과 사장님을 연결하는 <strong>합법적인 알바 플랫폼</strong>
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "16px 18px",
            border: "1px solid #EDEAE6",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Stat label="등록 알바" value="2,340+" color="#FF6B5A" />
          <Stat label="가입 외국인" value="25,000+" color="#0BD8A2" />
          <Stat label="외국인 구인기업" value="1,200+" color="#FF6B5A" />
        </div>
        <div style={{ fontSize: 11, color: "#8A8580", lineHeight: 1.6 }}>
          🏛️ 유료직업소개사업 · 📊 직업정보제공사업
          <br />
          🛡️ 구직자 보호 · 🌐 7개 언어
        </div>
      </aside>

      {/* ── 가운데: 모바일 UI (480px) ── */}
      <main
        style={{
          flex: "0 0 480px",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(26, 31, 61, 0.08), 0 0 0 1px rgba(26, 31, 61, 0.04)",
          overflow: "hidden",
          minHeight: "calc(100vh - 80px)",
        }}
      >
        {children}
      </main>

      {/* ── 우측: QR + 카카오톡 안내 ── */}
      <aside
        style={{
          flex: "0 0 280px",
          position: "sticky",
          top: 40,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "20px 18px",
            border: "1px solid #EDEAE6",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📱</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1F3D", marginBottom: 6 }}>
            휴대폰으로 접속하세요
          </div>
          <div style={{ fontSize: 11, color: "#8A8580", lineHeight: 1.6, marginBottom: 16 }}>
            K-ALBA는 모바일 환경에 최적화되어 있습니다
          </div>
          {/* QR 코드 — Google Chart API 사용 */}
          <div
            style={{
              width: 160,
              height: 160,
              margin: "0 auto",
              background: "#F7F5F0",
              borderRadius: 12,
              padding: 12,
              boxSizing: "border-box",
            }}
          >
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fk-alba.kr&margin=0"
              alt="K-ALBA QR 코드"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
          <div style={{ fontSize: 11, color: "#4A4640", marginTop: 12, fontFamily: "monospace" }}>
            k-alba.kr
          </div>
        </div>

        <div
          style={{
            background: "#FEE500",
            borderRadius: 16,
            padding: "16px 18px",
            border: "1px solid #FEE500",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#3C1E1E" }}>카카오톡 채널</div>
          </div>
          <div style={{ fontSize: 12, color: "#3C1E1E", lineHeight: 1.6, marginBottom: 10 }}>
            사장님은 카카오톡 챗봇으로
            <br />
            3분만에 공고 등록 가능
          </div>
          <a
            href="http://pf.kakao.com/_kalba"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              color: "#3C1E1E",
              background: "#fff",
              padding: "6px 12px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            @kalba 채널 열기 →
          </a>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: "#8A8580" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 900, color }}>{value}</span>
    </div>
  );
}
