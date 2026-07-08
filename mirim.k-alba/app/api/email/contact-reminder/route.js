import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendContactReminders } from "@/lib/newJobEmail";

/**
 * POST /api/email/contact-reminder
 * Body = { confirm: true, dryRun?: true }
 *
 * 연락수단(전화/휴대/이메일) 없이 direct/chatbot 공고를 올린 사장님에게
 * "내 공고에서 연락처를 추가해 주세요" 안내 메일을 1회 발송한다.
 * 테스트 중에는 EMAIL_REDIRECT_EMPLOYER_TO 로 리다이렉트되어 실제 사장님에겐 안 감.
 *
 * dryRun=true: 발송 없이 대상 사장님 수만 반환.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { confirm, dryRun } = await request.json().catch(() => ({}));

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (dryRun) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("employer_id")
        .eq("status", "active")
        .in("source_type", ["direct", "chatbot"])
        .is("contact_phone", null)
        .is("contact_mobile", null)
        .is("contact_email", null)
        .not("employer_id", "is", null);
      const empIds = [...new Set((jobs || []).map((j) => j.employer_id).filter(Boolean))];
      return NextResponse.json({ ok: true, dry_run: true, target_employers: empIds.length });
    }

    if (confirm !== true) {
      return NextResponse.json({ ok: false, error: "confirm:true 필요 (실발송 방지)" }, { status: 400 });
    }

    const result = await sendContactReminders(supabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[contact-reminder] error:", error);
    return NextResponse.json({ ok: false, error: error.message || "발송 오류" }, { status: 500 });
  }
}
