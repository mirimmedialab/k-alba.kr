/**
 * LLM 기반 공고 번역.
 *  - translateJob: 상세 페이지용(제목·설명·지역·회사명 음역).
 *  - translateListBatch: 목록용(여러 공고의 제목·지역을 한 번의 호출로 번역).
 * env에 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 중 있는 걸 자동 사용.
 * 실패/키없음 시 null 반환(호출측은 한국어 원본으로 폴백).
 */
const LANG_NAMES = {
  en: "English",
  vi: "Vietnamese — Tiếng Việt",
  zh: "Simplified Chinese — 简体中文",
  uz: "Uzbek (O'zbek tili) written in the Latin alphabet",
  mn: "Mongolian (Монгол хэл) written in Cyrillic script",
  ja: "Japanese — 日本語",
};

export function isSupportedLang(lang) {
  return Object.prototype.hasOwnProperty.call(LANG_NAMES, lang);
}

const RULES = [
  "CRITICAL RULES:",
  "- Write the ENTIRE output ONLY in the target language. Never output English or Korean (except unavoidable proper nouns/brand names).",
  "- Even for short or simple text, you MUST translate — do not fall back to another language.",
  "- Natural, concise, suitable for a job listing. Keep numbers, pay, and addresses accurate.",
  '- Store names, brand names, and company/proper names: keep them as-is or transliterate the SOUND. NEVER translate them into a literal meaning (e.g., a shop called "롱티" must NOT become "long tea" or "long T-shirt").',
  "- Region/place names: use the commonly used local-language name if one exists, otherwise transliterate the sound.",
].join("\n");

// 공통 LLM 호출 (텍스트 반환). 실패 시 null.
async function callLLM(prompt, maxTokens = 1500) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  try {
    if (anthropicKey) {
      const MODELS = ["claude-haiku-4-5-20251001", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];
      for (const model of MODELS) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
          signal: AbortSignal.timeout(25000),
        });
        if (r.status === 404) continue;
        if (!r.ok) return null;
        const d = await r.json();
        return d?.content?.[0]?.text || "";
      }
      return null;
    } else if (openaiKey) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.choices?.[0]?.message?.content || "";
    }
    return null;
  } catch (_) {
    return null;
  }
}

function parseJsonLoose(text) {
  try {
    const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(m ? m[0] : text);
  } catch (_) {
    return null;
  }
}

/**
 * 상세 페이지용: 제목·설명·지역·회사명(음역).
 */
export async function translateJob({ title, description, region, company, industry }, lang) {
  const name = LANG_NAMES[lang];
  if (!name) return null;

  const prompt = [
    "You are a professional translator for a part-time job platform serving foreign workers and students in Korea.",
    "Translate the Korean job fields below into " + name + ".",
    RULES,
    '- For "company": give the romanized/transliterated reading of the company name in ' + name + " (how it sounds), NOT a meaning translation.",
    '- For "industry": translate the meaning of the industry/business category.',
    'Return ONLY a JSON object with the keys: "title", "description", "region", "company", "industry" (use an empty string for any field that was empty). No extra text.',
    "",
    "Korean title: " + (title || ""),
    "Korean description: " + (description || ""),
    "Korean region: " + (region || ""),
    "Korean company: " + (company || ""),
    "Korean industry: " + (industry || ""),
  ].join("\n");

  const text = await callLLM(prompt, 1500);
  if (!text) return null;
  const obj = parseJsonLoose(text);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  return {
    title: typeof obj.title === "string" ? obj.title : (title || ""),
    description: typeof obj.description === "string" ? obj.description : (description || ""),
    region: typeof obj.region === "string" ? obj.region : (region || ""),
    company: typeof obj.company === "string" ? obj.company : (company || ""),
    industry: typeof obj.industry === "string" ? obj.industry : (industry || ""),
  };
}

/**
 * 용어 배치 번역: 한국어 용어 배열 → { [ko]: 번역 }.
 * 업종/지역 facet 라벨처럼 짧은 어구를 한 번에 번역할 때 사용.
 */
export async function translateTermsBatch(terms, lang) {
  const name = LANG_NAMES[lang];
  if (!name) return null;
  const uniq = [...new Set((terms || []).filter(Boolean))];
  if (uniq.length === 0) return {};

  const prompt = [
    "You are a professional translator for a part-time job platform serving foreign workers and students in Korea.",
    "Translate each Korean term (industry / category / region name) into " + name + ".",
    RULES,
    'Input is a JSON array of Korean strings. Return ONLY a JSON object mapping each input string to its ' + name + " translation. No extra text.",
    "",
    "Input:",
    JSON.stringify(uniq),
  ].join("\n");

  const text = await callLLM(prompt, 3000);
  if (!text) return null;
  const obj = parseJsonLoose(text);
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const out = {};
  for (const k of uniq) out[k] = typeof obj[k] === "string" ? obj[k] : k;
  return out;
}
