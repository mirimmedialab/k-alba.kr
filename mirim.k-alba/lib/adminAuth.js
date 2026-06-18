import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * 관리자 인증 (ID/비밀번호 + httpOnly 쿠키 세션)
 *
 * - 자격증명은 코드에 두지 않고 환경변수로 둔다.
 *     ADMIN_ID  (기본값 "kalbaadmin")
 *     ADMIN_PW  (필수 — 미설정 시 관리자 로그인 비활성)
 * - 로그인 성공 시 쿠키 kalba_admin = sha256(ADMIN_ID:ADMIN_PW) 를 굽는다.
 *   이 값은 서버 전용 ADMIN_PW를 알아야만 만들 수 있어 위조가 어렵다.
 */

export const ADMIN_COOKIE = "kalba_admin";

function adminId() {
  return process.env.ADMIN_ID || "kalbaadmin";
}

/** 아이디/비밀번호 검증 */
export function adminCredsOk(id, pw) {
  const PW = process.env.ADMIN_PW || "";
  if (!PW) return false;
  return id === adminId() && pw === PW;
}

/** 쿠키에 저장할 세션 토큰 */
export function adminSessionToken() {
  const PW = process.env.ADMIN_PW || "";
  return crypto.createHash("sha256").update(`${adminId()}:${PW}`).digest("hex");
}

/** 쿠키 값이 유효한 관리자 세션인지 (상수시간 비교) */
export function isValidAdminCookie(value) {
  const PW = process.env.ADMIN_PW || "";
  if (!PW || !value) return false;
  const expected = adminSessionToken();
  try {
    const a = Buffer.from(String(value));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseCookies(header) {
  const out = {};
  (header || "").split(/;\s*/).forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
}

export function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * 관리자 API 가드: 쿠키 검증 + RLS 우회용 service client 반환
 * @returns {{ svc } | { error, status }}
 */
export async function requireAdmin(request) {
  const svc = getServiceClient();
  if (!svc) return { error: "server_misconfigured", status: 500 };
  const cookies = parseCookies(request.headers.get("cookie") || "");
  if (!isValidAdminCookie(cookies[ADMIN_COOKIE])) {
    return { error: "unauthorized", status: 401 };
  }
  return { svc };
}

export function isAuthError(r) {
  return !!(r && r.error);
}
