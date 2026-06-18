import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "id, title, job_type, work_type, pay_type, pay_amount, address, sido, sigungu, " +
  "status, source_type, headcount, korean_level, visa_types, employer_id, " +
  "employer_external_name, created_at, expires_at, " +
  "employer:profiles(name, company_name)";

/**
 * GET /api/admin/jobs — 공고 목록
 * query: q, status(active|closed|all), source(direct|external|all), page, limit
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const status = searchParams.get("status") || "all";
  const source = searchParams.get("source") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = svc.from("jobs").select(COLUMNS, { count: "exact" });

  if (status !== "all") query = query.eq("status", status);
  if (source === "external") query = query.not("source_type", "is", null).neq("source_type", "direct");
  if (source === "direct") query = query.or("source_type.is.null,source_type.eq.direct");
  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(`title.ilike.%${esc}%,address.ilike.%${esc}%,employer_external_name.ilike.%${esc}%`);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ rows: data || [], total: count || 0, page, limit });
}

/**
 * PATCH /api/admin/jobs — 공고 상태 변경
 * body: { id, status }  (예: active | closed | hidden)
 */
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const { id, status } = body;
  if (!id || !status) return Response.json({ error: "missing_params" }, { status: 400 });

  const { data, error } = await svc
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}

/**
 * DELETE /api/admin/jobs?id=123 — 공고 영구 삭제
 */
export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "missing_id" }, { status: 400 });

  const { error } = await svc.from("jobs").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
