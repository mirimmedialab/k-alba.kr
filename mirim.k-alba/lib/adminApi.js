"use client";
import { supabase } from "@/lib/supabase";

/**
 * 관리자 페이지 → /api/admin/* 호출용 클라이언트 헬퍼.
 * 현재 로그인 세션의 access_token을 Authorization 헤더에 붙여서 호출한다.
 */
async function authHeader() {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminGet(path) {
  const headers = await authHeader();
  const res = await fetch(path, { headers, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `요청 실패 (${res.status})`);
  return json;
}

export async function adminSend(path, method, body) {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };
  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `요청 실패 (${res.status})`);
  return json;
}

export const adminPatch = (path, body) => adminSend(path, "PATCH", body);
export const adminPost = (path, body) => adminSend(path, "POST", body);
export const adminDelete = (path) => adminSend(path, "DELETE");
