import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNewJobEmailsForJob } from "@/lib/newJobEmail";

/**
 * 신규 공고 등록 시 이메일 알림 발송
 *
 * POST /api/jobs/notify-new-job-email
 * Body = { job_id: "uuid" }
 *
 * 호출: 공고 등록 직후 (웹 폼 page.jsx / 카톡 챗봇 kakaoPostJob.js) fire-and-forget.
 * 처리: 동의한 알바생에게 광고성 알림 + 사장님에게 서비스 확인 메일.
 *       공고당 1회(jobs.email_notified_at claim). 야간 등록분은 deferred → 아침 크론이 발송.
 *
 * 환경변수:
 *   SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   RESEND_API_KEY, NEXT_PUBLIC_SITE_URL, EMAIL_UNSUB_SECRET(선택)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  try {
    const { job_id, force, dryRun } = await request.json();

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // dryRun=true: 발송하지 않고 리다이렉트 활성 여부·대상자 수만 반환(안전 점검용).
    if (dryRun) {
      const fb = (process.env.EMAIL_REDIRECT_TO || "").trim();
      const workerRedirect = (process.env.EMAIL_REDIRECT_WORKER_TO || fb).trim();
      const employerRedirect = (process.env.EMAIL_REDIRECT_EMPLOYER_TO || fb).trim();
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_type", "worker")
        .is("deactivated_at", null)
        .not("agreed_marketing_at", "is", null);
      return NextResponse.json({
        ok: true,
        dry_run: true,
        redirect_active: !!(workerRedirect || employerRedirect),
        worker_redirect: workerRedirect || null,
        employer_redirect: employerRedirect || null,
        consenting_workers: count ?? null,
      });
    }

    if (!job_id) {
      return NextResponse.json({ ok: false, error: "job_id 필요" }, { status: 400 });
    }

    // force=true: 야간(23~08 KST) 차단 우회 — 관리자 수동 재발송/테스트용.
    const result = await sendNewJobEmailsForJob(supabase, job_id, {
      ignoreBusinessHours: force === true,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[notify-new-job-email] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "발송 중 오류 발생" },
      { status: 500 }
    );
  }
}
