import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * 교육 콘텐츠 번역 API (파파고 NMT — NCP)
 *
 * POST { course_id, lang }  lang ∈ en|vi|zh|ja|uz|mn
 *   - 권한: 해당 과정을 볼 수 있는 사용자 (RLS로 검증 — 사용자 토큰 스코프 클라이언트로 조회)
 *   - 번역 결과는 training_courses.translations[langKey] 에 캐시 (원문 수정 시 재번역)
 *   - 파파고 미지원 언어(uz, mn)는 영어 번역으로 대체 (fallback: "en")
 *   - 환경변수 NCP_PAPAGO_KEY_ID / NCP_PAPAGO_KEY 미설정 시 503 (UI에서 안내)
 */

const PAPAGO_URL = "https://papago.apis.ntruss.com/nmt/v1/translation";
// K-ALBA 언어 → 파파고 target (미지원 언어는 영어로 대체)
const LANG_MAP = { en: "en", vi: "vi", zh: "zh-CN", ja: "ja", uz: "en", mn: "en" };

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

async function papago(texts, target) {
  const id = process.env.NCP_PAPAGO_KEY_ID;
  const key = process.env.NCP_PAPAGO_KEY;
  if (!id || !key) return null; // 미설정
  const out = [];
  const CHUNK = 5; // 동시 호출 제한
  for (let i = 0; i < texts.length; i += CHUNK) {
    const batch = texts.slice(i, i + CHUNK);
    const results = await Promise.all(batch.map(async (text) => {
      if (!text || !text.trim()) return text || "";
      const res = await fetch(PAPAGO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-NCP-APIGW-API-KEY-ID": id,
          "X-NCP-APIGW-API-KEY": key,
        },
        body: new URLSearchParams({ source: "ko", target, text }).toString(),
      });
      if (!res.ok) throw new Error(`papago ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const d = await res.json();
      return d?.message?.result?.translatedText ?? text;
    }));
    out.push(...results);
  }
  return out;
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { course_id, lang } = await req.json();
    const target = LANG_MAP[lang];
    if (!course_id || !target) {
      return NextResponse.json({ ok: false, error: "course_id, lang이 필요합니다." }, { status: 400 });
    }
    const cacheKey = target; // en/vi/zh-CN/ja — uz·mn은 en 캐시 공유

    // 권한: 사용자 토큰 스코프로 과정 조회 (RLS 적용)
    const uc = userClient(token);
    const { data: course, error } = await uc
      .from("training_courses")
      .select("id, sections, questions, translations, updated_at")
      .eq("id", course_id)
      .maybeSingle();
    if (error || !course) return NextResponse.json({ ok: false, error: "과정을 찾을 수 없습니다." }, { status: 404 });

    // 캐시 유효성
    const cached = course.translations?.[cacheKey];
    if (cached && cached.source_updated_at === course.updated_at) {
      return NextResponse.json({ ok: true, lang: cacheKey, sections: cached.sections, questions: cached.questions, cached: true });
    }

    // 번역 대상 텍스트 평탄화
    const sections = course.sections || [];
    const questions = course.questions || [];
    const texts = [];
    const idx = { sections: [], questions: [] };
    for (const s of sections) {
      idx.sections.push({ title: texts.length, body: texts.length + 1 });
      texts.push(s.title || "", s.body || "");
    }
    for (const q of questions) {
      const qi = { q: texts.length, choices: [] };
      texts.push(q.q || "");
      for (const c of q.choices || []) { qi.choices.push(texts.length); texts.push(c || ""); }
      idx.questions.push(qi);
    }

    const translated = await papago(texts, target);
    if (translated === null) {
      return NextResponse.json({ ok: false, error: "translation_unconfigured" }, { status: 503 });
    }

    const tSections = sections.map((s, i) => ({
      ...s,
      title: translated[idx.sections[i].title],
      body: translated[idx.sections[i].body],
    }));
    const tQuestions = questions.map((q, i) => ({
      ...q,
      q: translated[idx.questions[i].q],
      choices: (q.choices || []).map((_, ci) => translated[idx.questions[i].choices[ci]]),
    }));

    // 캐시 저장 (service role)
    const svc = svcClient();
    const newTranslations = {
      ...(course.translations || {}),
      [cacheKey]: { sections: tSections, questions: tQuestions, source_updated_at: course.updated_at, translated_at: new Date().toISOString() },
    };
    await svc.from("training_courses").update({ translations: newTranslations }).eq("id", course_id);

    return NextResponse.json({ ok: true, lang: cacheKey, sections: tSections, questions: tQuestions, cached: false });
  } catch (e) {
    console.error("[training-translate] error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
