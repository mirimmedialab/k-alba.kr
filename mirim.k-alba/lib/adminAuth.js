import { createClient } from "@supabase/supabase-js";

/**
 * 관리자 API 공통 인증 유틸 (서버 전용)
 *
 * 모든 /api/admin/* 라우트는 RLS를 우회해야 하므로 SERVICE_ROLE_KEY로 동작한다.
 * 미들웨어는 /api/* 를 가드하지 않으므로(폴스루) 각 라우트에서 반드시 requireAdmin()으로
 * 호출자가 role=admin 인지 토큰을 검증한다. (이중 보안)
 */

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Bearer 토큰을 검증하고 role=admin 인지 확인한다.
 * @returns {{ svc, user } | { error, status }}
 */
export async function requireAdmin(request) {
  const svc = getServiceClient();
  if (!svc) return { error: "server_misconfigured", status: 500 };

  const token = (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return { error: "unauthorized", status: 401 };

  const { data, error } = await svc.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { error: "invalid_token", status: 401 };

  const role = user.user_metadata?.role || user.app_metadata?.role;
  if (role !== "admin") return { error: "forbidden", status: 403 };

  return { svc, user };
}

/** requireAdmin 결과가 에러인지 검사 */
export function isAuthError(r) {
  return !!(r && r.error);
}
