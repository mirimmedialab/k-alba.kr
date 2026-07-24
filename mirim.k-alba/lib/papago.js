// 파파고(NCP) 번역 공용 헬퍼 — 교육 콘텐츠 번역에 사용
// 환경변수 NCP_PAPAGO_KEY_ID / NCP_PAPAGO_KEY 필요 (미설정 시 null 반환)

const PAPAGO_URL = "https://papago.apis.ntruss.com/nmt/v1/translation";

// K-ALBA locale → 파파고 target (uz/mn 미지원 → 영어 대체)
export const PAPAGO_LANG_MAP = { en: "en", vi: "vi", zh: "zh-CN", ja: "ja", uz: "en", mn: "en" };
export const PAPAGO_TARGETS = ["en", "vi", "zh-CN", "ja"]; // 사전 생성 대상

export function papagoConfigured() {
  return !!(process.env.NCP_PAPAGO_KEY_ID && process.env.NCP_PAPAGO_KEY);
}

/** texts 배열을 ko→target으로 번역 (미설정 시 null) */
export async function papagoTranslate(texts, target) {
  const id = process.env.NCP_PAPAGO_KEY_ID;
  const key = process.env.NCP_PAPAGO_KEY;
  if (!id || !key) return null;
  const out = [];
  const CHUNK = 5;
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

/** 과정(sections/questions)을 target 언어로 번역해 {sections, questions} 반환 (미설정 시 null) */
export async function translateCourseContent(course, target) {
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
  const translated = await papagoTranslate(texts, target);
  if (translated === null) return null;
  return {
    sections: sections.map((s, i) => ({ ...s, title: translated[idx.sections[i].title], body: translated[idx.sections[i].body] })),
    questions: questions.map((q, i) => ({
      ...q,
      q: translated[idx.questions[i].q],
      choices: (q.choices || []).map((_, ci) => translated[idx.questions[i].choices[ci]]),
    })),
  };
}
