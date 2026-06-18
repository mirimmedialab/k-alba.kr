import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/auth/check — 쿠키 유효성 확인 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ ok: false }, { status: auth.status });
  return Response.json({ ok: true });
}
