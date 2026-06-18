import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * K-ALBA 통합 미들웨어 (디바이스 라우팅 + 페르소나 권한 가드)
 *
 * 1. 디바이스 라우팅: 모바일이 / 접속 시 → /m 으로 rewrite (URL은 / 유지)
 * 2. 관리자(/admin): 별도 ID/비밀번호 세션 쿠키(kalba_admin) 존재 여부로 게이트.
 *    (실제 검증은 /api/admin/* 라우트에서 쿠키 값을 재검증 — 이중 가드)
 * 3. 페르소나 권한 가드: /my/jobs·/jobs/post·/applicants(employer), /staff/*(staff)
 */

// 관리자 세션 쿠키 이름 (lib/adminAuth.js의 ADMIN_COOKIE와 동일하게 유지)
const ADMIN_COOKIE = "kalba_admin";

const GUARDS = [
  {
    name: "employer-only",
    matcher: (path) =>
      path.startsWith("/my/jobs") ||
      path.startsWith("/jobs/post") ||
      path === "/applicants" ||
      path.startsWith("/applicants/"),
    requires: { user_type: "employer" },
    redirect: (path) => `/?reason=employer-only&from=${encodeURIComponent(path)}`,
  },
  {
    name: "staff-only",
    matcher: (path) => path.startsWith("/staff/"),
    excludes: ["/staff/register"],
    requires: { staff: true },
    redirect: () => "/staff/register",
  },
];

// 로그인 필요 라우트 (Supabase 세션 기반) — /admin 은 별도 쿠키 게이트라 제외
const AUTH_REQUIRED_ROUTES = [
  "/my/",
  "/profile",
  "/applicants",
  "/contracts/",
  "/jobs/post",
  "/staff/",
  "/partwork/",
];

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // ─── 1) 디바이스 라우팅 ───
  if (path === "/") {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
    if (isMobile) {
      const url = request.nextUrl.clone();
      url.pathname = "/m";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ─── 2) 정적 파일 / API 제외 ───
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api/") ||
    path.startsWith("/static/") ||
    path.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // ─── 3) 관리자 콘솔 게이트 (ID/PW 쿠키 존재 여부) ───
  if (path === "/admin" || path.startsWith("/admin/")) {
    const hasCookie = request.cookies.get(ADMIN_COOKIE);
    if (!hasCookie) {
      return NextResponse.redirect(new URL("/login/admin", request.url));
    }
    return NextResponse.next();
  }

  // ─── 4) 로그인 필요 여부 (Supabase 세션) ───
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((r) => path.startsWith(r));
  if (!requiresAuth) return NextResponse.next();

  // ─── 5) Supabase 세션 확인 ───
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // ─── 6) 페르소나 가드 ───
  for (const guard of GUARDS) {
    if (!guard.matcher(path)) continue;
    if (guard.excludes?.some((ex) => path.startsWith(ex))) continue;

    const ok = await checkGuard(supabase, user, guard.requires);
    if (!ok) {
      const redirectUrl = new URL(guard.redirect(path), request.url);
      redirectUrl.searchParams.set("debug_user_type", user.user_metadata?.user_type || "undefined");
      redirectUrl.searchParams.set("debug_guard", guard.name);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

async function checkGuard(supabase, user, requires) {
  if (requires.user_type) {
    const cached =
      user.user_metadata?.user_type || user.app_metadata?.user_type;
    if (cached) return cached === requires.user_type;
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();
    return profile?.user_type === requires.user_type;
  }

  if (requires.staff) {
    const { count } = await supabase
      .from("university_staff")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);
    return (count || 0) > 0;
  }

  return true;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.).*)"],
};
