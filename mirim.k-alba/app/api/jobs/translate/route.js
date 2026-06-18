import { createClient } from "@supabase/supabase-js";
import { translateJob, isSupportedLang } from "@/lib/llmTranslate";

/**
 * POST /api/jobs/translate  { jobId, lang, title?, description? }
 * 지연 번역 + 캐싱: 캐시 있으면 즉시 반환, 없으면 1회 번역 후 저장.
 * 번역 불가 시 한국어 원본을 반환해 화면은 항상 보이게 함.
 * 번역 항목: 제목, 설명, 지역(sido+sigungu), 회사명(음역).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "server_misconfigured" }, { status: 500 });

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const jobId = body?.jobId;
  const lang = String(body?.lang || "");
  const overrideTitle = typeof body?.title === "string" ? body.title : null;
  const overrideDescription = typeof body?.description === "string" ? body.description : null;
  if (!jobId || !isSupportedLang(lang)) {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  // cache: 설명까지 채워져 있으면 즉시 반환
  const { data: cached } = await db
    .from("job_translations").select("title, description, region, company, industry, work, benefits")
    .eq("job_id", jobId).eq("lang", lang).maybeSingle();
  if (cached && cached.description) {
    return Response.json({ ok: true, cached: true, ...cached });
  }

  // source: 클라이언트가 보고 있는 텍스트 우선
  const { data: job } = await db
    .from("jobs").select("title, description, sido, sigungu, address, employer_external_name, job_type, work_hours, benefits").eq("id", jobId).maybeSingle();
  if (!job && overrideTitle == null && overrideDescription == null) {
    return Response.json({ ok: false, error: "job_not_found" }, { status: 404 });
  }
  const regionKo = [job?.sido, job?.sigungu].filter(Boolean).join(" ") || job?.address || "";
  const src = {
    title: overrideTitle != null ? overrideTitle : (job?.title || ""),
    description: overrideDescription != null ? overrideDescription : (job?.description || ""),
    region: regionKo,
    company: job?.employer_external_name || "",
    industry: job?.job_type || "",
    work: job?.work_hours || "",
    benefits: job?.benefits || "",
  };

  // translate
  const t = await translateJob(src, lang);
  if (!t) {
    return Response.json({ ok: false, error: "translate_unavailable", title: src.title, description: src.description, region: src.region, company: src.company, industry: src.industry, work: src.work, benefits: src.benefits });
  }

  // save + return
  await db.from("job_translations").upsert({
    job_id: jobId, lang, title: t.title, description: t.description, region: t.region, company: t.company, industry: t.industry, work: t.work, benefits: t.benefits,
  });
  return Response.json({ ok: true, cached: false, ...t });
}
