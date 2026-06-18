import { createClient } from "@supabase/supabase-js";
import { translateTermsBatch, isSupportedLang } from "@/lib/llmTranslate";

/**
 * POST /api/terms/translate-batch  { terms: string[], lang }
 * 업종/지역 facet 라벨 등 짧은 한국어 용어를 번역/캐싱.
 * 반환: { ok, map: { [ko]: 번역 } }
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
  const terms = Array.isArray(body?.terms)
    ? [...new Set(body.terms.map((x) => String(x || "").trim()).filter(Boolean))].slice(0, 60)
    : [];
  if (!isSupportedLang(lang)) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  if (terms.length === 0) return Response.json({ ok: true, map: {} });

  const db = createClient(url, key, { auth: { persistSession: false } });

  // 1) 캐시
  const { data: cachedRows } = await db
    .from("term_translations").select("ko, val").in("ko", terms).eq("lang", lang);
  const map = {};
  const have = new Set();
  for (const r of cachedRows || []) { map[r.ko] = r.val; have.add(r.ko); }

  // 2) 미번역
  const missing = terms.filter((k) => !have.has(k));
  if (missing.length === 0) return Response.json({ ok: true, map });

  const translated = await translateTermsBatch(missing, lang);
  if (!translated) {
    for (const k of missing) map[k] = k; // 폴백: 원문
    return Response.json({ ok: false, error: "translate_unavailable", map });
  }

  const upserts = [];
  for (const k of missing) {
    const val = translated[k] || k;
    map[k] = val;
    upserts.push({ ko: k, lang, val });
  }
  if (upserts.length > 0) await db.from("term_translations").upsert(upserts, { onConflict: "ko,lang" });

  return Response.json({ ok: true, map });
}
