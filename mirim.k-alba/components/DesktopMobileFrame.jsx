"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";

/**
 * DesktopMobileFrame (v2 - Login/Signup Style)
 *
 * 데스크톱 사용자가 서비스 페이지에 접근했을 때:
 *   - 메인 콘텐츠 영역(440px)을 화면 중앙에 배치
 *   - 우측에 작은 QR 코드만 표시
 *   - 좌우 사이드바 제거 (깔끔한 중앙 레이아웃)
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
 *   - 로그인/회원가입 페이지와 동일한 레이아웃 스타일
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

  // 데스크톱: 중앙 440px + 우측 QR (로그인/회원가입 스타일)
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background: T.paper,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "flex-start",
          paddingLeft: "calc(50% - 220px)", // 메인 영역(440px) 중앙 정렬
        }}
      >
        {/* ── 메인 콘텐츠 (440px) ── */}
        <main style={{ width: 440 }}>
          {children}
        </main>

        {/* ── 우측 QR 코드 ── */}
        <aside
          style={{
            display: "block",
            textAlign: "center",
            paddingTop: 80,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 8,
              background: "#fff",
              padding: 8,
              marginBottom: 8,
              border: `1px solid ${T.border}`,
            }}
          >
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fk-alba.kr&margin=0"
              alt="K-ALBA QR"
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 3 }}>
            K-ALBA
          </div>
          <div style={{ fontSize: 10, color: T.ink2, lineHeight: 1.4 }}>
            휴대폰으로<br />접속하세요
          </div>
        </aside>
      </div>
    </div>
  );
}
