import { createClient } from "@supabase/supabase-js";
import { translateJob, isSupportedLang } from "@/lib/llmTranslate";

/**
 * POST /api/jobs/translate  { jobId, lang }
 * 지연 번역 + 캐싱: 캐시 있으면 즉시 반환, 없으면 1회 번역 후 job_translations에 저장.
 * 번역 불가(키 미설정/실패) 시 한국어 원본을 반환해 화면은 항상 내용이 보이게 함.
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

  // ── 임시 진단 모드 (?debug) — 원인 파악 후 제거 ──
  if (body && body.debug) {
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const info = { hasAnthropic, hasOpenAI };
    if (hasAnthropic) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 100, messages: [{ role: "user", content: "Translate to English, return only the text: 안녕하세요" }] }),
        });
        info.anthropicStatus = r.status;
        info.anthropicBody = (await r.text()).slice(0, 800);
      } catch (e) { info.anthropicFetchError = String(e && e.message || e); }
    }
    return Response.json(info);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  // 1) 캐시
  const { data: cached } = await db
    .from("job_translations").select("title, description")
    .eq("job_id", jobId).eq("lang", lang).maybeSingle();
  if (cached) return Response.json({ ok: true, cached: true, ...cached });

  // 2) 원본 (클라이언트가 보고 있는 텍스트 우선 — 워크넷 보강 제목/설명 대응)
  let src;
  if (overrideTitle != null || overrideDescription != null) {
    src = { title: overrideTitle || "", description: overrideDescription || "" };
  } else {
    const { data: job } = await db
      .from("jobs").select("title, description").eq("id", jobId).maybeSingle();
    if (!job) return Response.json({ ok: false, error: "job_not_found" }, { status: 404 });
    src = job;
  }

  // 3) 번역
  const t = await translateJob(src, lang);
  if (!t) {
    // 번역 불가 → 원본 반환(캐시는 안 함)
    return Response.json({ ok: false, error: "translate_unavailable", title: src.title, description: src.description });
  }

  // 4) 저장 + 반환
  await db.from("job_translations").upsert({ job_id: jobId, lang, title: t.title, description: t.description });
  return Response.json({ ok: true, cached: false, ...t });
}
