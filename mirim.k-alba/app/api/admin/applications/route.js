import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applications — 지원/매칭 현황 (읽기 전용)
 * query: type(applications|partwork|contracts), page, limit
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "applications";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query;
  if (type === "partwork") {
    query = svc
      .from("partwork_applications")
      .select(
        "id, applicant_name, applicant_email, visa, university_name, employer_name, position, status, weekly_hours, hourly_pay, created_at",
        { count: "exact" }
      );
  } else if (type === "contracts") {
    query = svc
      .from("contracts")
      .select(
        "id, worker_name, employer_name, company_name, job_title, status, worker_signed, employer_signed, hourly_pay, pay_amount, created_at",
        { count: "exact" }
      );
  } else {
    query = svc
      .from("applications")
      .select(
        "id, status, message, created_at, job:jobs(title, sigungu), applicant:profiles(name, visa, nationality)",
        { count: "exact" }
      );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ rows: data || [], total: count || 0, page, limit, type });
}
