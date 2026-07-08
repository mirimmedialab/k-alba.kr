import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNewJobEmailsForJob, isBusinessHoursKST } from "@/lib/newJobEmail";

/**
 * GET /api/cron/flush-new-job-emails
 *
 * 야간(23~08 KST)에 등록되어 실시간 발송이 보류(deferred)된 공고들을
 * 업무시간에 모아서 발송한다. 실시간 호출이 실패/누락된 공고의 안전망 역할도 함.
 *
 * 대상: status='active' AND email_notified_at IS NULL AND 최근 2일 이내 등록.
 * 인증: Vercel Cron 이 붙이는 Authorization: Bearer ${CRON_SECRET}.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  // 인증 (수동 호출 시에도 동일 헤더 필요)
  const auth = request.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 업무시간이 아니면 아무것도 안 함 (다음 크론이 처리)
  if (!isBusinessHoursKST()) {
    return NextResponse.json({ ok: true, skipped: "off_hours" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("status", "active")
    .in("source_type", ["direct", "chatbot"]) // 사용자 등록 공고만 (워크넷 제외)
    .is("email_notified_at", null)
    .gte("created_at", twoDaysAgo)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results = [];
  for (const j of pending) {
    const r = await sendNewJobEmailsForJob(supabase, j.id, { ignoreBusinessHours: true });
    results.push({ job_id: j.id, ...r });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
