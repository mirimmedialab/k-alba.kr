import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * K-ALBA 검증 근무이력 + 사장님 평가 조회 API
 *
 * GET ?worker_id=...
 *   권한: ① 알바생 본인  ② 해당 알바생의 지원을 받은 사장님
 *   반환: 양측 서명이 완료된 계약 목록 + 사장님→알바생 평가(별점·코멘트)
 *   ※ 다른 사장님의 상호·기간·평가만 노출하고 급여 등 계약 세부는 제외 (최소 노출)
 */

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

async function getCaller(req, supabase) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(h.substring(7));
  return data?.user || null;
}

export async function GET(req) {
  try {
    const supabase = svc();
    const user = await getCaller(req, supabase);
    if (!user) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workerId = searchParams.get("worker_id") || user.id;

    // 권한: 본인 or 지원받은 사장님
    let authorized = workerId === user.id;
    if (!authorized) {
      const { data: app } = await supabase
        .from("applications")
        .select("id, job:jobs!inner(employer_id)")
        .eq("applicant_id", workerId)
        .eq("job.employer_id", user.id)
        .limit(1)
        .maybeSingle();
      authorized = !!app;
    }
    if (!authorized) return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

    // 완료(양측 서명) 계약
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, company_name, contract_start, contract_end, job_description, worker_signed, employer_signed, employer:profiles!contracts_employer_id_fkey(company_name)")
      .eq("worker_id", workerId)
      .eq("worker_signed", true)
      .eq("employer_signed", true)
      .order("contract_start", { ascending: false });

    const ids = (contracts || []).map((c) => c.id);
    let reviewMap = {};
    if (ids.length) {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("contract_id, rating, comment, created_at")
        .in("contract_id", ids)
        .eq("direction", "employer_to_worker");
      for (const r of reviews || []) reviewMap[r.contract_id] = r;
    }

    const history = (contracts || []).map((c) => ({
      id: c.id,
      workplace: c.company_name || c.employer?.company_name || "-",
      job: (c.job_description || "").slice(0, 60),
      start: (c.contract_start || "").slice(0, 10),
      end: (c.contract_end || "").slice(0, 10),
      review: reviewMap[c.id]
        ? { rating: reviewMap[c.id].rating, comment: reviewMap[c.id].comment, date: (reviewMap[c.id].created_at || "").slice(0, 10) }
        : null,
    }));

    return NextResponse.json({ ok: true, history });
  } catch (e) {
    console.error("[resume-history] error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
