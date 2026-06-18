import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sync — 공고 동기화 모니터링
 * 반환: { logs: 최근 30건, sourceCounts: { worknet, agriwork, direct } }
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const head = { count: "exact", head: true };
  const [logsRes, worknet, agriwork, directNull, directVal] = await Promise.all([
    svc
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(30),
    svc.from("jobs").select("id", head).eq("source_type", "worknet"),
    svc.from("jobs").select("id", head).eq("source_type", "agriwork"),
    svc.from("jobs").select("id", head).is("source_type", null),
    svc.from("jobs").select("id", head).eq("source_type", "direct"),
  ]);

  if (logsRes.error) return Response.json({ error: logsRes.error.message }, { status: 500 });

  return Response.json({
    logs: logsRes.data || [],
    sourceCounts: {
      worknet: worknet.count || 0,
      agriwork: agriwork.count || 0,
      direct: (directNull.count || 0) + (directVal.count || 0),
    },
  });
}
