/**
 * GET /api/cron/cleanup-expired-jobs
 *
 * Vercel Cron — 매일 KST 12:00 호출
 * 만료된 공고를 status='expired' 로 자동 마감.
 *
 * 인증
 *   - Authorization: Bearer ${CRON_SECRET}
 *
 * 동작
 *   1. expires_at 이 지난 활성 공고 → status='expired'
 *   2. expires_at 이 NULL 인데 created_at 으로부터 30일 경과한 공고 → status='expired'
 *   3. sync_logs 에 cleanup 실행 기록 남김
 */
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const startedAt = new Date();
  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      source: "cleanup",
      status: "running",
      started_at: startedAt.toISOString(),
    })
    .select()
    .single();

  try {
    const now = new Date().toISOString();

    // 1) 마감일이 지난 공고
    const { data: expiredByDate, error: e1 } = await supabase
      .from("jobs")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now)
      .select("id");
    if (e1) throw e1;

    // 2) 마감일 미설정 + 30일 경과
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: expiredByAge, error: e2 } = await supabase
      .from("jobs")
      .update({ status: "expired" })
      .eq("status", "active")
      .is("expires_at", null)
      .lt("created_at", thirtyDaysAgo)
      .select("id");
    if (e2) throw e2;

    // 마감(expired) 처리된 공고들의 번역 캐시도 삭제 (행 자체는 유지되므로 명시적으로 정리)
    const expiredIds = [...(expiredByDate || []), ...(expiredByAge || [])].map((r) => r.id);
    if (expiredIds.length > 0) {
      await supabase.from("job_translations").delete().in("job_id", expiredIds);
    }

    const total =
      (expiredByDate?.length || 0) + (expiredByAge?.length || 0);

    await supabase
      .from("sync_logs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        items_updated: total,
        metadata: {
          expired_by_date: expiredByDate?.length || 0,
          expired_by_age: expiredByAge?.length || 0,
        },
      })
      .eq("id", logEntry.id);

    return Response.json({
      ok: true,
      expired_by_date: expiredByDate?.length || 0,
      expired_by_age: expiredByAge?.length || 0,
      total,
    });
  } catch (e) {
    console.error("[cleanup-expired-jobs] error:", e);

    await supabase
      .from("sync_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: e?.message?.slice(0, 500) || String(e),
      })
      .eq("id", logEntry.id);

    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 만료 공고 정리 실패: ${e?.message || e}`,
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
