import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS =
  "id, email, name, phone, user_type, visa, nationality, country, company_name, " +
  "business_number, verified, korean_level, organization, deactivated_at, created_at, " +
  "resignup_count, reactivated_at";

/**
 * GET /api/admin/users — 회원 목록
 * query: q, type(worker|employer|all), status(active|deactivated|all), page, limit
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const type = searchParams.get("type") || "all";
  const status = searchParams.get("status") || "all";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = svc.from("profiles").select(COLUMNS, { count: "exact" });

  if (type === "worker" || type === "employer") query = query.eq("user_type", type);
  if (status === "active") query = query.is("deactivated_at", null);
  if (status === "deactivated") query = query.not("deactivated_at", "is", null);
  if (q) {
    const esc = q.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%,company_name.ilike.%${esc}%`
    );
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const [{ data, count, error }, activeRes, deactRes] = await Promise.all([
    query,
    svc.from("profiles").select("id", { count: "exact", head: true }).is("deactivated_at", null),
    svc.from("profiles").select("id", { count: "exact", head: true }).not("deactivated_at", "is", null),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    rows: data || [],
    total: count || 0,
    activeTotal: activeRes.count || 0,
    deactivatedTotal: deactRes.count || 0,
    page,
    limit,
  });
}

/**
 * PATCH /api/admin/users — 회원 상태 변경
 * body: { id, action: "verify"|"unverify"|"deactivate"|"reactivate" }
 */
export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const { id, action } = body;
  if (!id || !action) return Response.json({ error: "missing_params" }, { status: 400 });

  const updates = {};
  switch (action) {
    case "verify": updates.verified = true; break;
    case "unverify": updates.verified = false; break;
    case "deactivate": updates.deactivated_at = new Date().toISOString(); break;
    case "reactivate": updates.deactivated_at = null; break;
    default: return Response.json({ error: "unknown_action" }, { status: 400 });
  }

  const { data, error } = await svc.from("profiles").update(updates).eq("id", id).select(COLUMNS).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, row: data });
}
