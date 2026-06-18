import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats — 관리자 대시보드 지표
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  const { svc } = auth;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const head = { count: "exact", head: true };

  const [
    usersTotal,
    workers,
    employers,
    deactivated,
    newUsers7d,
    jobsTotal,
    jobsActive,
    applications,
    contracts,
    partwork,
    recentSync,
    pendingStaff,
  ] = await Promise.all([
    svc.from("profiles").select("id", head),
    svc.from("profiles").select("id", head).eq("user_type", "worker"),
    svc.from("profiles").select("id", head).eq("user_type", "employer"),
    svc.from("profiles").select("id", head).not("deactivated_at", "is", null),
    svc.from("profiles").select("id", head).gte("created_at", since7d),
    svc.from("jobs").select("id", head),
    svc.from("jobs").select("id", head).eq("status", "active"),
    svc.from("applications").select("id", head),
    svc.from("contracts").select("id", head),
    svc.from("partwork_applications").select("id", head),
    svc
      .from("sync_logs")
      .select("id, source, status, started_at, completed_at, items_fetched, items_new, items_failed")
      .order("started_at", { ascending: false })
      .limit(6),
    svc.from("staff_registrations").select("id", head).eq("status", "pending"),
  ]);

  return Response.json({
    users: {
      total: usersTotal.count || 0,
      workers: workers.count || 0,
      employers: employers.count || 0,
      deactivated: deactivated.count || 0,
      new7d: newUsers7d.count || 0,
    },
    jobs: {
      total: jobsTotal.count || 0,
      active: jobsActive.count || 0,
    },
    applications: applications.count || 0,
    contracts: contracts.count || 0,
    partwork: partwork.count || 0,
    recentSync: recentSync.data || [],
    pendingStaff: pendingStaff.count || 0,
  });
}
