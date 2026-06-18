import { requireAdmin, isAuthError } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 카카오 챗봇 공고등록 상태머신 단계 라벨 (lib/kakaoPostJob.js의 STEPS 순서와 일치)
const KAKAO_STEPS = [
  "업체명", "업종", "공고 제목", "급여 형태", "급여 금액", "주소", "비자", "연락처",
  "근무 형태", "근무 시간", "근무 요일", "한국어 수준", "모집 인원", "복리후생", "상세 설명",
];

/**
 * GET /api/admin/monitoring — 운영 모니터링 (읽기 전용)
 * query: type(sync|staff|kakao|deactivations)
 */
export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "sync";

  // 카카오 드래프트: 작성자 프로필(이름/업체) + 공고 제목 + 진행 단계 보강
  if (type === "kakao") {
    const { data: drafts, error } = await svc
      .from("kakao_job_drafts")
      .select("bot_user_key, step, data, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const keys = [...new Set((drafts || []).map((d) => d.bot_user_key).filter(Boolean))];
    const profMap = {};
    if (keys.length) {
      const { data: profs } = await svc
        .from("profiles")
        .select("kakao_bot_user_key, name, company_name, user_type")
        .in("kakao_bot_user_key", keys);
      (profs || []).forEach((p) => { profMap[p.kakao_bot_user_key] = p; });
    }

    const total = KAKAO_STEPS.length;
    const rows = (drafts || []).map((d) => {
      const p = profMap[d.bot_user_key] || {};
      const step = typeof d.step === "number" ? d.step : null;
      const done = step != null && step >= total;
      return {
        bot_user_key: d.bot_user_key,
        name: p.name || null,
        company_name: p.company_name || null,
        user_type: p.user_type || null,
        linked: !!profMap[d.bot_user_key],
        draft_title: (d.data && d.data.title) || null,
        step,
        step_no: step == null ? null : Math.min(step + 1, total),
        step_total: total,
        step_label: done ? "완료" : (step != null ? (KAKAO_STEPS[step] || "-") : "-"),
        updated_at: d.updated_at,
      };
    });
    return Response.json({ rows, type });
  }

  let query;
  if (type === "staff") {
    query = svc
      .from("staff_registrations")
      .select("id, university_name, applicant_name, applicant_position, applicant_email, applicant_phone, status, created_at")
      .order("created_at", { ascending: false })
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
