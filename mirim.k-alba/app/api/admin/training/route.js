import { requireAdmin, isAuthError } from "@/lib/adminAuth";
import { PAPAGO_TARGETS, translateCourseContent, papagoConfigured } from "@/lib/papago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 어드민 — 본사(브랜드) 공통 교육 관리
 *
 * GET  /api/admin/training           과정 목록 (본사 과정 + 응시 수)
 * POST /api/admin/training           과정 생성/수정 { id?, brand_name, title, ... }
 * POST /api/admin/training?action=translate&id=N   전 언어(en/vi/zh-CN/ja) 번역 사전 생성
 * DELETE /api/admin/training?id=N    과정 삭제
 */

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { data: courses, error } = await svc
    .from("training_courses")
    .select("*")
    .not("brand_name", "is", null)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (courses || []).map((c) => c.id);
  const counts = {};
  const avgs = {};
  if (ids.length) {
    const { data: rs } = await svc
      .from("training_results")
      .select("course_id, job_score, job_total, korean_score, korean_total")
      .in("course_id", ids);
    for (const r of rs || []) {
      counts[r.course_id] = (counts[r.course_id] || 0) + 1;
      const a = avgs[r.course_id] || { job: 0, jobT: 0, ko: 0, koT: 0 };
      a.job += r.job_score; a.jobT += r.job_total; a.ko += r.korean_score; a.koT += r.korean_total;
      avgs[r.course_id] = a;
    }
  }
  return Response.json({
    ok: true,
    papago: papagoConfigured(),
    courses: (courses || []).map((c) => ({
      ...c,
      result_count: counts[c.id] || 0,
      avg: avgs[c.id] || null,
      translated_langs: Object.keys(c.translations || {}).filter(
        (k) => c.translations[k]?.source_updated_at === c.updated_at
      ),
    })),
  });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;

  const { searchParams } = new URL(request.url);

  // ── 전 언어 번역 사전 생성 ──
  if (searchParams.get("action") === "translate") {
    const id = parseInt(searchParams.get("id") || "0", 10);
    if (!id) return Response.json({ error: "id가 필요합니다." }, { status: 400 });
    if (!papagoConfigured()) return Response.json({ error: "translation_unconfigured" }, { status: 503 });

    const { data: course } = await svc.from("training_courses").select("*").eq("id", id).maybeSingle();
    if (!course) return Response.json({ error: "과정을 찾을 수 없습니다." }, { status: 404 });

    const translations = { ...(course.translations || {}) };
    const done = [];
    for (const target of PAPAGO_TARGETS) {
      if (translations[target]?.source_updated_at === course.updated_at) { done.push(target); continue; }
      const t = await translateCourseContent(course, target);
      if (t) {
        translations[target] = { ...t, source_updated_at: course.updated_at, translated_at: new Date().toISOString() };
        done.push(target);
      }
    }
    await svc.from("training_courses").update({ translations }).eq("id", id);
    return Response.json({ ok: true, translated: done });
  }

  // ── 과정 생성/수정 ──
  const body = await request.json();
  const { id, brand_name, title, description, sections, questions, open_to_applicants, is_active } = body;
  if (!brand_name?.trim() || !title?.trim()) {
    return Response.json({ error: "brand_name과 title은 필수입니다." }, { status: 400 });
  }
  const row = {
    owner_id: null, // 본사 과정은 소유자 없음 (어드민 관리)
    brand_name: brand_name.trim(),
    title: title.trim(),
    description: description?.trim() || null,
    sections: sections || [],
    questions: questions || [],
    open_to_applicants: open_to_applicants !== false,
    is_active: is_active !== false,
    updated_at: new Date().toISOString(),
  };
  const query = id
    ? svc.from("training_courses").update(row).eq("id", id).select().single()
    : svc.from("training_courses").insert(row).select().single();
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, course: data });
}

export async function DELETE(request) {
  const auth = await requireAdmin(request);
  if (isAuthError(auth)) return Response.json({ error: auth.error }, { status: auth.status });
  const { svc } = auth;
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0", 10);
  if (!id) return Response.json({ error: "id가 필요합니다." }, { status: 400 });
  const { error } = await svc.from("training_courses").delete().eq("id", id).not("brand_name", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
