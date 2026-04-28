"use client";
import { usePathname } from "next/navigation";
import DesktopMobileFrame from "./DesktopMobileFrame";
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
 */
export default function AppFrame({ children }) {
  const pathname = usePathname();

  return (
    <I18nProvider>
      {pathname === "/" ? (
        <>{children}</>
      ) : (
        <DesktopMobileFrame>{children}</DesktopMobileFrame>
      )}
    </I18nProvider>
  );
}
