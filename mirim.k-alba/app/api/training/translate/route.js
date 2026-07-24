import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PAPAGO_LANG_MAP, translateCourseContent } from "@/lib/papago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * 교육 콘텐츠 번역 API (파파고 NMT — NCP)
 *
 * POST { course_id, lang }  lang ∈ en|vi|zh|ja|uz|mn
 *   - 권한: 해당 과정을 볼 수 있는 사용자 (사용자 토큰 스코프 클라이언트로 RLS 검증)
 *   - 결과는 training_courses.translations[target]에 캐시 (원문 수정 시 재번역)
 *   - 파파고 미지원 언어(uz, mn)는 영어 번역으로 대체
 *   - 환경변수 미설정 시 503 (UI에서 안내)
 */

function svcClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
function userClient(token) {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { course_id, lang } = await req.json();
    const target = PAPAGO_LANG_MAP[lang];
    if (!course_id || !target) {
      return NextResponse.json({ ok: false, error: "course_id, lang이 필요합니다." }, { status: 400 });
    }

    // 권한: 사용자 토큰 스코프로 과정 조회 (RLS 적용 — 개별/본사 과정 모두)
    const uc = userClient(token);
    const { data: course, error } = await uc
      .from("training_courses")
      .select("id, sections, questions, translations, updated_at")
      .eq("id", course_id)
      .maybeSingle();
    if (error || !course) return NextResponse.json({ ok: false, error: "과정을 찾을 수 없습니다." }, { status: 404 });

    const cached = course.translations?.[target];
    if (cached && cached.source_updated_at === course.updated_at) {
      return NextResponse.json({ ok: true, lang: target, sections: cached.sections, questions: cached.questions, cached: true });
    }

    const translated = await translateCourseContent(course, target);
    if (translated === null) {
      return NextResponse.json({ ok: false, error: "translation_unconfigured" }, { status: 503 });
    }

    const svc = svcClient();
    const newTranslations = {
      ...(course.translations || {}),
      [target]: { ...translated, source_updated_at: course.updated_at, translated_at: new Date().toISOString() },
    };
    await svc.from("training_courses").update({ translations: newTranslations }).eq("id", course_id);

    return NextResponse.json({ ok: true, lang: target, ...translated, cached: false });
  } catch (e) {
    console.error("[training-translate] error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
