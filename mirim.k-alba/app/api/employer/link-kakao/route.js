import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/employer/link-kakao
 * Body: { botUserKey: string }
 * Header: Authorization: Bearer <user access_token>
 *
 * 로그인(카카오 인증)을 마친 사용자의 토큰을 검증한 뒤,
 * 서비스 권한으로 해당 회원 프로필에 kakao_bot_user_key를 연결하고 사장님(employer)으로 설정한다.
 * 프로필 행이 없으면 생성(upsert)한다. (RLS/0건 업데이트 문제 회피)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const botUserKey = String(body?.botUserKey || "").trim();
  if (!botUserKey) {
    return Response.json({ ok: false, error: "missing_bot_user_key" }, { status: 400 });
  }

  // 1) 사용자 토큰 검증 (로그인 필수 — 인증 우회 방지)
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const svc = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await svc.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  // 2) 이 botUserKey가 다른 회원에게 이미 연결돼 있으면 떼어낸다(중복 방지)
  await svc
    .from("profiles")
    .update({ kakao_bot_user_key: null })
    .eq("kakao_bot_user_key", botUserKey)
    .neq("id", user.id);

  // 3) 현재 인증된 회원 프로필에 연결 + 사장님 설정 (없으면 생성)
  const { error: upErr } = await svc.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      user_type: "employer",
      kakao_bot_user_key: botUserKey,
    },
    { onConflict: "id" }
  );

  if (upErr) {
    return Response.json({ ok: false, error: "link_failed", detail: upErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
