"use client";

/**
 * 관리자 페이지 → /api/admin/* 호출용 클라이언트 헬퍼.
 * 인증은 httpOnly 쿠키(kalba_admin)로 자동 전송되므로 별도 토큰이 필요 없다.
 */
export async function adminGet(path) {
  const res = await fetch(path, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `요청 실패 (${res.status})`);
  return json;
}

export async function adminSend(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `요청 실패 (${res.status})`);
  return json;
}

export const adminPatch = (path, body) => adminSend(path, "PATCH", body);
export const adminPost = (path, body) => adminSend(path, "POST", body);
export const adminDelete = (path) => adminSend(path, "DELETE");
