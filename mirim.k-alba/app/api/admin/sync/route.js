import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG_COLS =
  "id, source, status, started_at, completed_at, items_fetched, items_new, items_updated, items_failed, error";

/**
 * GET /api/admin/sync — 동기화 실행 이력
 * 반환: { collect: 수집(cleanup 제외), cleanup: 만료 정리, sourceCounts }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const head = { count: "exact", head: true };
  const [collectRes, cleanupRes, worknet, agriwork, directNull, directVal] = await Promise.all([
    svc.from("sync_logs").select(LOG_COLS).neq("source", "cleanup").order("started_at", { ascending: false }).limit(30),
    svc.from("sync_logs").select(LOG_COLS).eq("source", "cleanup").order("started_at", { ascending: false }).limit(30),
    svc.from("jobs").select("id", head).eq("source_type", "worknet"),
    svc.from("jobs").select("id", head).eq("source_type", "agriwork"),
    svc.from("jobs").select("id", head).is("source_type", null),
    svc.from("jobs").select("id", head).eq("source_type", "direct"),
  ]);

  if (collectRes.error) return Response.json({ error: collectRes.error.message }, { status: 500 });

  return Response.json({
    collect: collectRes.data || [],
    cleanup: cleanupRes.data || [],
    sourceCounts: {
      worknet: worknet.count || 0,
      agriwork: agriwork.count || 0,
      direct: (directNull.count || 0) + (directVal.count || 0),
    },
  });
}
