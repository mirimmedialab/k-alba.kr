import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * 관리자 인증 (ID/비밀번호 + httpOnly 서명 쿠키 세션)
 *
 * - 자격증명은 코드에 두지 않고 환경변수로 둔다.
 *     ADMIN_ID  (기본값 "kalbaadmin")
 *     ADMIN_PW  (필수 — 미설정 시 관리자 로그인 비활성)
 *     ADMIN_SESSION_SECRET (선택 — 미설정 시 ADMIN_PW를 서명 키로 사용)
 * - 로그인 성공 시 쿠키 kalba_admin = "v2.<발급시각ms>.<HMAC>" 를 굽는다.
 *   · HMAC = HMAC-SHA256(secret, "<ADMIN_ID>:<발급시각ms>")
 *   · 발급시각이 쿠키 안에 들어있어 서버에서 만료(7일)를 강제할 수 있고,
 *     secret 없이는 위조가 불가능하다.
 */

export const ADMIN_COOKIE = "kalba_admin";

// 세션 유효기간 (서버측 강제 만료). 쿠키 maxAge와 동일하게 7일.
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function adminId() {
  return process.env.ADMIN_ID || "kalbaadmin";
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PW || "";
}

/** 두 문자열의 상수시간 비교 (길이 노출 방지를 위해 해시 후 비교) */
function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** 아이디/비밀번호 검증 (상수시간 비교) */
export function adminCredsOk(id, pw) {
  const PW = process.env.ADMIN_PW || "";
  if (!PW) return false;
  // 두 비교를 모두 수행해 단락(short-circuit) 타이밍 누출을 막는다.
  const idOk = safeEqual(id, adminId());
  const pwOk = safeEqual(pw, PW);
  return idOk && pwOk;
}

function hmac(issuedAtMs) {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(`${adminId()}:${issuedAtMs}`)
    .digest("hex");
}

/** 쿠키에 저장할 새 세션 토큰 (발급할 때마다 발급시각이 갱신됨) */
export function adminSessionToken() {
  const issuedAt = Date.now();
  return `v2.${issuedAt}.${hmac(issuedAt)}`;
}

/** 쿠키 값이 유효한 관리자 세션인지 (서명 + 만료 검증, 상수시간 비교) */
export function isValidAdminCookie(value) {
  if (!sessionSecret() || !value) return false;
  const parts = String(value).split(".");
  if (parts.length !== 3 || parts[0] !== "v2") return false;

  const issuedAt = Number(parts[1]);
  if (!Number.isFinite(issuedAt)) return false;
  // 서버측 만료 강제 (탈취된 쿠키의 무기한 재사용 차단)
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return false;
  // 미래 시각(시계 오차 허용 범위 초과) 거부
  if (issuedAt - Date.now() > 60 * 1000) return false;

  try {
    const expected = hmac(issuedAt);
    const a = Buffer.from(parts[2], "hex");
    const b = Buffer.from(expected, "hex");
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
