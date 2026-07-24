// 평가 결과 다각도 분석 유틸

export const TYPE_ORDER = {
  korean: ["listening", "reading", "expr", "usage", "general"],
  job: ["process", "figures", "concept", "general"],
};

/** course.questions + result.answers → 파트·유형별 정오 분석 */
export function computeBreakdown(questions = [], answers = []) {
  const out = { korean: {}, job: {} };
  questions.forEach((q, i) => {
    const part = q.kind === "korean" ? "korean" : "job";
    const type = q.type || "general";
    const a = answers?.[i];
    if (a === null || a === undefined) return; // 미응시 문항 제외
    const slot = (out[part][type] = out[part][type] || { correct: 0, total: 0 });
    slot.total++;
    if (a === q.answer) slot.correct++;
  });
  return out;
}

export function partScore(breakdown, part) {
  let c = 0, t = 0;
  for (const k of Object.keys(breakdown[part] || {})) {
    c += breakdown[part][k].correct;
    t += breakdown[part][k].total;
  }
  return { correct: c, total: t, pct: t ? Math.round((c / t) * 100) : null };
}

/** 강점/보완 유형 추출 (응시 문항 2개 이상인 유형 대상) */
export function strengthsAndWeaknesses(breakdown) {
  const items = [];
  for (const part of ["korean", "job"]) {
    for (const [type, v] of Object.entries(breakdown[part] || {})) {
      if (v.total >= 2) items.push({ part, type, pct: Math.round((v.correct / v.total) * 100) });
    }
  }
  if (!items.length) return { strengths: [], weaknesses: [] };
  const sorted = [...items].sort((a, b) => b.pct - a.pct);
  return {
    strengths: sorted.filter((x) => x.pct >= 80).slice(0, 3),
    weaknesses: sorted.filter((x) => x.pct < 60).slice(-3).reverse(),
  };
}
