"use client";
import { usePathname } from "next/navigation";
import DesktopMobileFrame from "./DesktopMobileFrame";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { KakaoFloatingButton } from "./KakaoFloatingButton";
import { I18nProvider } from "@/lib/i18n";

/**
 * AppFrame
 *
 * Root layout에 클라이언트 사이드로 적용하는 wrapper.
 * I18nProvider로 전체 앱을 감싸서 다국어 지원.
 */

// NavBar를 숨길 경로 (랜딩 페이지만 자체 히어로가 있어 숨김)
const HIDE_NAVBAR_ON = ["/login/admin", "/auth/callback"];
// Footer를 숨길 경로 (자체 푸터가 있는 페이지)
const HIDE_FOOTER_ON = ["/", "/m", "/login/admin", "/auth/callback"];
// DesktopMobileFrame(데스크톱 440px 카드)을 사용하지 않을 경로
const NO_FRAME_ON = ["/", "/m", "/privacy", "/terms", "/login/admin", "/auth/callback"];
// KakaoFloatingButton 을 숨길 경로 (랜딩만 자체 CTA 가짐)
const NO_KAKAO_ON = ["/", "/m", "/login/admin", "/auth/callback"];
// 데스크탑 웹 레이아웃을 자체 구현해 440px 폰 프레임을 적용하지 않을 페이지(점진 추가)
const WIDE_PAGES = ["/my/applications", "/my/favorites", "/my/contracts", "/partwork", "/profile", "/my/jobs", "/jobs/post", "/applicants", "/contracts/new"];

export default function AppFrame({ children }) {
  const pathname = usePathname();
  // 관리자 콘솔(/admin)은 자체 데스크탑 전용 레이아웃(사이드바)을 가지므로
  // 폰 프레임·네비·푸터·카카오버튼을 모두 적용하지 않는다.
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const showNavBar = !HIDE_NAVBAR_ON.includes(pathname) && !isAdmin;
  const showFooter = !HIDE_FOOTER_ON.includes(pathname) && !isAdmin;
  // /jobs(목록)·/jobs/[id](상세)·/jobs/map(지도)는 PC 전용 와이드 레이아웃을 자체적으로 그리므로
  // 440px 프레임을 적용하지 않는다. (/jobs/post 폼은 프레임 유지)
  const isJobsBrowse =
    pathname === "/jobs" ||
    pathname === "/jobs/map" ||
    (/^\/jobs\/[^/]+$/.test(pathname) &&
      pathname !== "/jobs/post" &&
      pathname !== "/jobs/map");
  const useFrame =
    !isAdmin && !NO_FRAME_ON.includes(pathname) && !isJobsBrowse && !WIDE_PAGES.includes(pathname);
  const showKakao = !NO_KAKAO_ON.includes(pathname) && !isAdmin;

  return (
    <I18nProvider>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {showNavBar && <NavBar />}
        <div style={{ flex: "1 0 auto" }}>
          {useFrame ? <DesktopMobileFrame>{children}</DesktopMobileFrame> : children}
        </div>
        {showFooter && <Footer />}
      </div>
      {showKakao && <KakaoFloatingButton />}
    </I18nProvider>
  );
}
