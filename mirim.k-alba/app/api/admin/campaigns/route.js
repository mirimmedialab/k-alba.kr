import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "id, name, subject, status, total_targets, sent_count, opened_count, clicked_count, created_at";

/**
 * GET /api/admin/campaigns — 이메일 캠페인 목록
 * query: status(draft|scheduled|sending|sent|all), page, limit
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "100", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = svc.from("email_campaigns").select(COLUMNS, { count: "exact" });
  if (status !== "all") query = query.eq("status", status);
  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ rows: data || [], total: count || 0, page, limit });
}
