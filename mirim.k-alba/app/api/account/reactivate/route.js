import { createClient } from "@supabase/supabase-js";
import { reactivationFields } from "@/lib/reactivation";

/**
 * POST /api/account/reactivate  (이메일 재가입 = 탈퇴 계정 재활성화, 정책 A)
 * Body: { email, password, userType, name, visa?, consent?:{agreed_terms_at,agreed_privacy_at,agreed_marketing_at} }
 *
 * 동작:
 *  1) 이메일로 프로필(=계정) 조회
 *  2) 활성 계정이면 거부(계정 탈취 방지) → 프론트는 "이미 가입된 이메일" 처리
 *  3) 탈퇴(비활성화) 계정이면: 비밀번호 재설정 + email 확정 + 프로필 재활성화(초기화)
 *     · 이전 데이터는 삭제하지 않고 data_reset_at 경계로 화면에서만 숨김
 *     · reactivated_at / resignup_count 로 관리자만 재가입자 확인
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
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const userType = body?.userType === "employer" ? "employer" : "worker";
  const name = typeof body?.name === "string" ? body.name.slice(0, 100) : null;
  const visa = typeof body?.visa === "string" ? body.visa : null;
  const consent = body?.consent && typeof body.consent === "object" ? body.consent : {};

  if (!email || !password || password.length < 8) {
    return Response.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }

  const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 1) 이메일로 계정 찾기
  const { data: prof } = await svc
    .from("profiles")
    .select("id, deactivated_at, resignup_count")
    .eq("email", email)
    .maybeSingle();

  if (!prof) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  // 2) 활성 계정이면 재활성화 금지(탈취 방지)
  if (!prof.deactivated_at) {
    return Response.json({ ok: false, error: "active" }, { status: 409 });
  }

  // 3) 비밀번호 재설정 + 이메일 확정
  const { error: authErr } = await svc.auth.admin.updateUserById(prof.id, {
    password,
    email_confirm: true,
    user_metadata: { user_type: userType, name },
  });
  if (authErr) {
    return Response.json({ ok: false, error: "reactivate_failed", detail: authErr.message }, { status: 500 });
  }

  // 4) 프로필 재활성화(초기화) + 재가입 입력값 반영
  const reset = reactivationFields((prof.resignup_count || 0) + 1);
  const { error: pErr } = await svc
    .from("profiles")
    .update({
      ...reset,
      user_type: userType,
      name,
      visa: userType === "worker" ? (visa || null) : null,
      agreed_terms_at: consent.agreed_terms_at || null,
      agreed_privacy_at: consent.agreed_privacy_at || null,
      agreed_marketing_at: consent.agreed_marketing_at || null,
    })
    .eq("id", prof.id);
  if (pErr) {
    return Response.json({ ok: false, error: "profile_failed", detail: pErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
