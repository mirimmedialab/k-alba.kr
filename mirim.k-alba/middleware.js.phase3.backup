import { NextResponse } from "next/server";

/**
 * 디바이스 기반 라우팅 미들웨어
 *
 * - 모바일 디바이스가 `/`로 접속 시 → `/m` (모바일 랜딩)으로 rewrite
 *   URL은 `/`로 유지되어 사용자가 모름
 * - 데스크톱은 `/` 그대로 (현재 McKinsey 스타일 랜딩)
 *
 * 기준: User-Agent 정규식
 *   Mobile / Android / iPhone / iPad / iPod
 *
 * matcher로 `/`만 매칭 — 정적 자산이나 다른 경로는 영향 없음
 */
export function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);

  if (isMobile) {
    // 모바일 → /m 페이지를 렌더링하되 URL은 / 유지
    const url = request.nextUrl.clone();
    url.pathname = "/m";
    return NextResponse.rewrite(url);
  }

  // 데스크톱은 그대로
  return NextResponse.next();
}

export const config = {
  // 루트 경로만 매칭 — 다른 페이지(/jobs, /login 등)에는 영향 없음
  matcher: ["/"],
};
