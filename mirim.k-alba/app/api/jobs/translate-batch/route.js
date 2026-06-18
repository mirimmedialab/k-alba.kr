import { createClient } from "@supabase/supabase-js";
import { translateListBatch, isSupportedLang } from "@/lib/llmTranslate";

/**
 * POST /api/jobs/translate-batch  { ids: number[], lang }
 * 목록(현재 페이지)에서 보이는 공고들의 제목·지역을 한 번에 번역.
 * - 캐시에 있으면 재사용, 없는 것만 1회 LLM 배치 호출로 번역 후 저장.
 * - 설명(description)은 건드리지 않음(상세 진입 시 지연 번역).
 * 반환: { ok, map: { [id]: { title, region } } }  (번역 불가 시 원본 한국어로 채워 반환)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "server_misconfigured" }, { status: 500 });

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const lang = String(body?.lang || "");
  const ids = Array.isArray(body?.ids) ? body.ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)).slice(0, 40) : [];
  if (!isSupportedLang(lang)) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  if (ids.length === 0) return Response.json({ ok: true, map: {} });

  const db = createClient(url, key, { auth: { persistSession: false } });

  // 1) 캐시 조회
  const { data: cachedRows } = await db
    .from("job_translations").select("job_id, title, region")
    .in("job_id", ids).eq("lang", lang);
  const map = {};
  const cachedIds = new Set();
  for (const r of cachedRows || []) {
    if (r.title) {
      map[String(r.job_id)] = { title: r.title, region: r.region || "" };
      cachedIds.add(Number(r.job_id));
    }
  }

  // 2) 미번역 대상
  const missingIds = ids.filter((id) => !cachedIds.has(id));
  if (missingIds.length === 0) return Response.json({ ok: true, map });

  const { data: jobs } = await db
    .from("jobs").select("id, title, sido, sigungu, address").in("id", missingIds);
  const items = (jobs || []).map((j) => ({
    id: j.id,
    title: j.title || "",
    region: [j.sido, j.sigungu].filter(Boolean).join(" ") || j.address || "",
  }));

  // 3) 배치 번역
  const translated = await translateListBatch(items, lang);

  if (!translated) {
    // 번역 불가 → 원본 한국어로 채워 반환(캐시는 안 함)
    for (const it of items) map[String(it.id)] = { title: it.title, region: it.region };
    return Response.json({ ok: false, error: "translate_unavailable", map });
  }

  // 4) 저장 + 결과 병합 (description은 건드리지 않음)
  const upserts = [];
  for (const it of items) {
    const tr = translated[String(it.id)];
    const title = tr?.title || it.title;
    const region = tr?.region || it.region;
    map[String(it.id)] = { title, region };
    upserts.push({ job_id: it.id, lang, title, region });
  }
  if (upserts.length > 0) {
    await db.from("job_translations").upsert(upserts, { onConflict: "job_id,lang" });
  }

  return Response.json({ ok: true, map });
}
