/**
 * LLM 기반 공고 번역 (제목·설명만).
 * env에 ANTHROPIC_API_KEY 또는 OPENAI_API_KEY 중 있는 걸 자동 사용.
 * 실패/키없음 시 null 반환(호출측은 한국어 원본으로 폴백).
 */
const LANG_NAMES = {
  en: "English",
  vi: "Vietnamese (Tiếng Việt)",
  zh: "Simplified Chinese (简体中文)",
  uz: "Uzbek (O'zbekcha)",
  mn: "Mongolian (Монгол)",
  ja: "Japanese (日本語)",
};

export function isSupportedLang(lang) {
  return Object.prototype.hasOwnProperty.call(LANG_NAMES, lang);
}

export async function translateJob({ title, description }, lang) {
  const name = LANG_NAMES[lang];
  if (!name) return null;

  const prompt =
    `You translate part-time job postings for a platform serving foreign workers/students in Korea.\n` +
    `Translate the Korean fields below into ${name}. Keep it natural, concise, and appropriate for a job listing.\n` +
    `Keep store/brand/proper names sensible (don't over-translate). Numbers, pay, addresses stay accurate.\n` +
    `Return ONLY a JSON object with exactly two string keys: "title" and "description". No extra text.\n\n` +
    `Korean title: ${title || ""}\n` +
    `Korean description: ${description || ""}`;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  let text = "";

  try {
    if (anthropicKey) {
      // 모델명이 시점에 따라 바뀌므로 후보를 순차 시도(404면 다음 후보)
      const MODELS = ["claude-haiku-4-5-20251001", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"];
      for (const model of MODELS) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
          signal: AbortSignal.timeout(20000),
        });
        if (r.status === 404) continue; // 모델 미존재 → 다음 후보
        if (!r.ok) return null;
        const d = await r.json();
        text = d?.content?.[0]?.text || "";
        break;
      }
    } else if (openaiKey) {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
        signal: AbortSignal.timeout(20000),
      });
      const d = await r.json();
      text = d?.choices?.[0]?.message?.content || "";
    } else {
      return null; // 번역 키 미설정
    }
  } catch (_) {
    return null;
  }

  try {
    const m = text.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(m ? m[0] : text);
    return {
      title: typeof obj.title === "string" ? obj.title : (title || ""),
      description: typeof obj.description === "string" ? obj.description : (description || ""),
    };
  } catch (_) {
    return null;
  }
}
