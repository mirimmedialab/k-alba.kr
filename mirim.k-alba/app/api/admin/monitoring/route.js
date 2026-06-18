import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/monitoring — 운영 모니터링 (읽기 전용)
 * query: type(sync|staff|reports|kakao|deactivations)
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sync";

  let query;
  if (type === "staff") {
    query = svc
      .from("staff_registrations")
      .select("id, university_name, applicant_name, applicant_position, applicant_email, applicant_phone, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
  } else if (type === "reports") {
    query = svc
      .from("staff_misconduct_reports")
      .select("id, category, description, status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(50);
  } else if (type === "kakao") {
    query = svc
      .from("kakao_job_drafts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
  } else if (type === "deactivations") {
    query = svc
      .from("account_deactivations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
  } else {
    query = svc
      .from("sync_logs")
      .select("id, source, status, started_at, completed_at, items_fetched, items_new, items_updated, items_failed, error")
      .order("started_at", { ascending: false })
      .limit(50);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ rows: data || [], type });
}
