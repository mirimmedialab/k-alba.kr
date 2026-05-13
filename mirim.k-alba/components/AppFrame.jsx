"use client";
import { usePathname } from "next/navigation";
import DesktopMobileFrame from "./DesktopMobileFrame";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { I18nProvider } from "@/lib/i18n";

/**
 * AppFrame
 *
 * Root layout에 클라이언트 사이드로 적용하는 wrapper.
 * I18nProvider로 전체 앱을 감싸서 다국어 지원.
 *
 * 동작:
 * - 루트 `/` 경로는 데스크톱 풀 랜딩(McKinsey 스타일)이므로 wrapper 비활성화
 *   - 모바일 사용자도 미들웨어 rewrite로 /m 페이지가 렌더되지만 URL은 / 이므로
 *     usePathname() === "/" → wrapper 비활성화 → 모바일에서 풀스크린 표시
 * - 그 외 경로(/login, /signup, /jobs, /m 등)는 DesktopMobileFrame 적용
 *   - 데스크톱: 가운데 480px + 좌우 QR
 *   - 모바일: wrapper 내부에서 자체적으로 비활성화되어 풀스크린
 *
 * NavBar 표시 정책:
 * - 표시 안 함: 루트 랜딩 `/`, 모바일 랜딩 `/m`, 로그인 `/login`, 회원가입 `/signup`
 *   (이들은 자체적으로 LanguageSwitcher와 진입 CTA를 가지고 있음)
 * - 표시: 그 외 모든 서비스 페이지 (`/jobs`, `/my/jobs`, `/profile`, ...)
 *   사용자가 로그인 후 페이지 이동을 할 수 있게 sticky navbar로 표시.
 *   NavBar는 DesktopMobileFrame의 children 안에서 렌더되어
 *   모바일에서는 풀폭, 데스크톱에서는 480px 가운데 영역 안에 표시됨.
 */

// NavBar를 숨길 경로 (정확히 일치)
const HIDE_NAVBAR_ON = ["/", "/m", "/login", "/signup"];
// Footer를 숨길 경로 (자체 푸터가 있는 페이지)
const HIDE_FOOTER_ON = ["/", "/m"];
// DesktopMobileFrame을 사용하지 않을 경로 (단순 중앙 정렬)
const NO_FRAME_ON = ["/", "/m", "/login", "/signup"];

export default function AppFrame({ children }) {
  const pathname = usePathname();
  const showNavBar = !HIDE_NAVBAR_ON.includes(pathname);
  const showFooter = !HIDE_FOOTER_ON.includes(pathname);
  const useFrame = !NO_FRAME_ON.includes(pathname);

  // 루트 `/` 또는 frame 불필요한 경로: 직접 렌더
  if (!useFrame) {
    return (
      <I18nProvider>
        {children}
        {showFooter && <Footer />}
      </I18nProvider>
    );
  }

  // 그 외 경로: DesktopMobileFrame 적용 + 필요한 경우 NavBar/Footer 추가
  return (
    <I18nProvider>
      <DesktopMobileFrame>
        {showNavBar && <NavBar />}
        {children}
        {showFooter && <Footer />}
      </DesktopMobileFrame>
    </I18nProvider>
  );
}
