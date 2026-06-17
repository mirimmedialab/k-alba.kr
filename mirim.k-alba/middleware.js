import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

/**
 * K-ALBA 통합 미들웨어 (디바이스 라우팅 + 페르소나 권한 가드)
 *
 * 1. 디바이스 라우팅 (기존 동작 유지):
 *    - 모바일이 / 접속 시 → /m 으로 rewrite (URL은 / 유지)
 *
 * 2. 페르소나 권한 가드 (Step 5-5 신규):
 *    - /my/jobs, /jobs/post, /applicants → user_type='employer'만
 *    - /staff/* → university_staff에 등록된 사용자만
 *    - /admin/* → role='admin'만
 *    - 미인가 시 적절한 페이지로 리다이렉트
 *
 * 보안:
 *    - middleware는 Edge Runtime (Cloudflare Workers와 유사)
 *    - Supabase RLS가 2차 방어선 (이중 보안)
 */

// 페르소나별 가드 정책
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
    excludes: ["/staff/register"], // 첫 등록 페이지는 누구나 접근
    requires: { staff: true },
    redirect: () => "/staff/register",
  },
  {
    name: "admin-only",
    matcher: (path) => path.startsWith("/admin"),
    requires: { role: "admin" },
    redirect: () => "/?reason=admin-only",
  },
];

// 로그인 필요 라우트
const AUTH_REQUIRED_ROUTES = [
  "/my/",
  "/profile",
  "/applicants",
  "/contracts/",
  "/jobs/post",
  "/staff/",
  "/admin",
  "/partwork/",
];

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // ─── 1) 디바이스 라우팅 (기존 동작 유지) ───
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

  // ─── 3) 로그인 필요 여부 ───
  const requiresAuth = AUTH_REQUIRED_ROUTES.some((r) => path.startsWith(r));
  if (!requiresAuth) return NextResponse.next();

  // ─── 4) Supabase 세션 확인 ───
  const { supabase, response } = createClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // 디버깅: user_type 확인
  console.log("[middleware] User ID:", user.id);
  console.log("[middleware] user_metadata:", user.user_metadata);
  console.log("[middleware] app_metadata:", user.app_metadata);

  // ─── 5) 페르소나 가드 ───
  for (const guard of GUARDS) {
    if (!guard.matcher(path)) continue;
    if (guard.excludes?.some((ex) => path.startsWith(ex))) continue;

    const ok = await checkGuard(supabase, user, guard.requires);
    console.log("[middleware] Guard check:", guard.name, "Result:", ok);
    if (!ok) {
      // 디버그 정보를 URL에 포함
      const redirectUrl = new URL(guard.redirect(path), request.url);
      redirectUrl.searchParams.set("debug_user_type", user.user_metadata?.user_type || "undefined");
      redirectUrl.searchParams.set("debug_guard", guard.name);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

async function checkGuard(supabase, user, requires) {
  // user_type 검증
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

  // role 검증
  if (requires.role) {
    const role = user.user_metadata?.role || user.app_metadata?.role;
    return role === requires.role;
  }

  // staff 검증
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
