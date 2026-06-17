import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/account/deactivate  (회원 탈퇴 = 비활성화/소프트 삭제)
 * Header: Authorization: Bearer <user access_token>
 * Body:   { reasonCode?: string, reasonText?: string }
 *
 * 동작:
 *   1) 토큰 검증(로그인한 본인만)
 *   2) 탈퇴 사유 기록(account_deactivations) — 분석용 수집
 *   3) profiles.deactivated_at = now() (비활성화 표시, 데이터는 보관)
 *   4) 인증 사용자 밴(로그인 차단). 데이터는 남아있어 추후 복구 가능(관리자 unban + deactivated_at 해제).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const reasonCode = typeof body?.reasonCode === "string" ? body.reasonCode.slice(0, 60) : null;
  const reasonText = typeof body?.reasonText === "string" ? body.reasonText.slice(0, 1000) : null;

  const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: userData, error: userErr } = await svc.auth.getUser(token);
  const user = userData?.user;
  if (userErr || !user) {
    return Response.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  // 사용자 타입(분석용)
  let userType = user.user_metadata?.user_type || null;
  try {
    const { data: prof } = await svc.from("profiles").select("user_type").eq("id", user.id).maybeSingle();
    if (prof?.user_type) userType = prof.user_type;
  } catch (_) {}

  // 1) 탈퇴 사유 수집
  try {
    await svc.from("account_deactivations").insert({
      user_id: user.id,
      user_type: userType,
      reason_code: reasonCode,
      reason_text: reasonText,
    });
  } catch (_) { /* 기록 실패해도 탈퇴는 진행 */ }

  // 2) 프로필 비활성화 표시
  const { error: upErr } = await svc
    .from("profiles")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (upErr) {
    return Response.json({ ok: false, error: "deactivate_failed", detail: upErr.message }, { status: 500 });
  }

  // 로그인 차단은 앱 레벨에서 deactivated_at 확인으로 처리한다.
  // (auth 밴을 쓰면 카카오/구글 로그인 시 일반 오류로 떨어져 "없는 계정" 메시지를 못 보여주므로 미사용)
  return Response.json({ ok: true });
}
