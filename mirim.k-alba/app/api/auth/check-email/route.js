import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/check-email
 *
 * 로그인 실패 시 이메일 가입 여부 확인 → 미가입이면 회원가입 유도
 * Body = { email }
 * Response = { ok: true, exists: boolean }
 */
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "email 필요" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data } = await supabase
      .from("profiles")
      .select("id, deactivated_at")
      .ilike("email", email.trim())
      .maybeSingle();

    // 탈퇴 계정은 '없음'으로 처리 → 재가입 유도
    const exists = !!data && !data.deactivated_at;

    return NextResponse.json({ ok: true, exists });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
