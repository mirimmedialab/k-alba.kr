// 직무 평가 문항 자동 출제기
// 학습 섹션(매뉴얼 본문 + 한국어 영상 스크립트)에서 객관식 문항을 휴리스틱으로 생성한다.
//
// 전략:
//   A. 번호 단계(1. 2. 3. …) → "가장 먼저/마지막으로 해야 할 일은?" 순서 문항
//   B. 따옴표 인용구('어서오세요' 등) → 빈칸 문항 (다른 인용구가 오답)
//   C. 숫자+단위(3,000원, 25시간 등) → 빈칸 문항 (수치 변형 오답)
//   D. 핵심어(명사) → 빈칸 문항 (다른 핵심어가 오답)
//
// 생성 문항은 { q, choices[4], answer, kind: "job", auto: true } 형태.
// 목표 10~15문항 — 콘텐츠가 짧으면 가능한 만큼 생성.

const PARTICLES = /(은|는|이|가|을|를|에게|한테|에서|에|으로써|로써|으로|로|와|과|의|도|만|께서|께|까지|부터|보다|처럼|라고|이라고|입니다|합니다)$/;
// 빈칸으로 뽑기에 부적절한 부사·일반어
const STOPWORDS = new Set(["반드시", "즉시", "바로", "모두", "항상", "먼저", "다음", "이상", "이하", "경우", "때문", "가능", "진행", "확인"]);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr, n, exclude) {
  return shuffle(arr.filter((x) => x !== exclude && x !== excludeVal(exclude, x))).slice(0, n);
}
// (단순화를 위해 excludeVal 미사용 — pick은 아래에서 직접 구현)
function excludeVal() { return Symbol(); }

function mcq(q, correct, distractors) {
  const ds = [...new Set(distractors.filter((d) => d && d !== correct))].slice(0, 3);
  if (ds.length < 2) return null; // 보기 3개 미만이면 문항 성립 안 됨
  const choices = shuffle([correct, ...ds]);
  return { q, choices, answer: choices.indexOf(correct), kind: "job", auto: true };
}

function sentences(text) {
  return text
    .split(/(?<=[.!?다요]\s)|\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 10 && s.length <= 120);
}

/** 숫자 오답 변형 (3,000원 → 1,500원/6,000원/3,500원 등) */
function numberDistractors(numStr, unit) {
  const n = parseInt(numStr.replace(/,/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return [];
  const variants = [...new Set([Math.round(n / 2), n * 2, n + Math.max(1, Math.round(n * 0.5)), Math.max(1, n - Math.max(1, Math.round(n * 0.3)))])]
    .filter((v) => v > 0 && v !== n);
  return variants.map((v) => v.toLocaleString("ko-KR") + unit);
}

export function generateQuizFromSections(sections, { min = 10, max = 15 } = {}) {
  // 원문 수집: 본문 + 한국어 스크립트(i18n.ko — 영상 자막 업로드분)
  const blocks = [];
  for (const s of sections || []) {
    const text = [s.body || "", s.i18n?.ko || ""].filter(Boolean).join("\n");
    if (text.trim()) blocks.push({ title: s.title || "", text });
  }
  const questions = [];
  const seen = new Set();
  const add = (item) => {
    if (!item || !item.q) return;
    const key = item.q.slice(0, 60);
    if (seen.has(key)) return;
    seen.add(key);
    questions.push(item);
  };

  const allQuoted = [];
  const allKeywords = [];

  // ── A. 번호 단계 문항 ──
  for (const b of blocks) {
    const steps = [];
    for (const line of b.text.split("\n")) {
      const m = line.match(/^\s*(\d+)[.)]\s*(.{4,80})$/);
      if (m) steps.push(m[2].replace(/\s+/g, " ").trim());
    }
    if (steps.length >= 3) {
      add({ ...mcq(`[${b.title}] 다음 중 가장 먼저 해야 할 일은?`, steps[0], steps.slice(1)) || {}, type: "process" });
      add({ ...mcq(`[${b.title}] 다음 중 마지막 단계는?`, steps[steps.length - 1], steps.slice(0, -1)) || {}, type: "process" });
      if (steps.length >= 4) add({ ...mcq(`[${b.title}] '${steps[0].slice(0, 24)}' 바로 다음에 해야 할 일은?`, steps[1], [steps[2], steps[3], steps[0]].filter(Boolean)) || {}, type: "process" });
    }
  }

  // ── 후보 수집 (B·D용) ──
  for (const b of blocks) {
    for (const m of b.text.matchAll(/['‘“"]([^'’”"\n]{2,20})['’”"]/g)) allQuoted.push(m[1].trim());
    for (const sent of sentences(b.text)) {
      const tokens = sent.split(/\s+/).map((w) => w.replace(/[^가-힣A-Za-z0-9]/g, "").replace(PARTICLES, ""));
      const cands = tokens.filter((w) => /^[가-힣]{2,8}$/.test(w) && !STOPWORDS.has(w));
      if (cands.length) allKeywords.push(cands.sort((a, c) => c.length - a.length)[0]);
    }
  }
  const uniqQuoted = [...new Set(allQuoted)];
  const uniqKeywords = [...new Set(allKeywords)];

  // ── C. 숫자 빈칸 ──
  if (questions.length < max) {
    for (const b of blocks) {
      for (const sent of sentences(b.text)) {
        const m = sent.match(/(\d[\d,]*)\s*(원|시간|분|일|개월|주|%|℃|도|명|개)/);
        if (!m) continue;
        const correct = parseInt(m[1].replace(/,/g, ""), 10).toLocaleString("ko-KR") + m[2];
        const qText = sent.replace(m[0], "____");
        add({ ...mcq(`빈칸에 알맞은 것은?  ${qText}`, correct, numberDistractors(m[1], m[2])) || {}, type: "figures" });
        if (questions.length >= max) break;
      }
      if (questions.length >= max) break;
    }
  }

  // ── D. 핵심어 빈칸 (부족분 채우기) ──
  if (questions.length < min) {
    for (const b of blocks) {
      for (const sent of sentences(b.text)) {
        if (/['‘“"]/.test(sent)) continue; // 인용구 문장은 B에서 처리
        const tokens = sent.split(/\s+/);
        let best = "", bestClean = "";
        for (const tk of tokens) {
          const clean = tk.replace(/[^가-힣]/g, "").replace(PARTICLES, "");
          if (/^[가-힣]{2,8}$/.test(clean) && !STOPWORDS.has(clean) && clean.length > bestClean.length) { best = tk; bestClean = clean; }
        }
        if (!bestClean || bestClean.length < 2) continue;
        const qText = sent.replace(best, best.replace(bestClean, "____"));
        if (!qText.includes("____")) continue;
        add({ ...mcq(`빈칸에 알맞은 말은?  ${qText}`, bestClean, uniqKeywords.filter((x) => x !== bestClean)) || {}, type: "concept" });
        if (questions.length >= max) break;
      }
      if (questions.length >= max) break;
    }
  }

  return questions.slice(0, max);
}


// ─────────────────────────────────────────────
// 직무 한국어 평가 자동 출제 (직무 평가와 별도)
// 매뉴얼·스크립트에 등장하는 서비스 표현을 기반으로 생성.
// ─────────────────────────────────────────────

// 서비스 현장 표현 사전: 의미(영어) + 사용 상황
const SERVICE_EXPRESSIONS = [
  { ko: "어서오세요", en: "Welcome! (greeting a customer)", when: "손님이 매장에 들어올 때" },
  { ko: "감사합니다", en: "Thank you", when: "계산이 끝났을 때" },
  { ko: "안녕히 가세요", en: "Goodbye (to a leaving customer)", when: "손님이 나갈 때" },
  { ko: "또 오세요", en: "Please come again", when: "손님을 배웅할 때" },
  { ko: "포장해 드릴까요", en: "Would you like it to go (takeout)?", when: "음식을 포장할지 물어볼 때" },
  { ko: "봉투 필요하세요", en: "Do you need a bag?", when: "계산 시 봉투가 필요한지 물어볼 때" },
  { ko: "잠시만 기다려 주세요", en: "Please wait a moment", when: "확인이나 준비에 시간이 필요할 때" },
  { ko: "죄송합니다", en: "I'm sorry / I apologize", when: "실수했거나 사과할 때" },
  { ko: "영수증 드릴까요", en: "Would you like a receipt?", when: "계산 후 영수증이 필요한지 물어볼 때" },
  { ko: "환불해 드릴까요", en: "Would you like a refund?", when: "손님이 환불을 원할 때" },
  { ko: "뜨겁습니다", en: "It's hot (be careful)", when: "뜨거운 음식·음료를 건넬 때" },
  { ko: "주문 도와드릴까요", en: "May I take your order?", when: "손님의 주문을 받을 때" },
  { ko: "적립카드 있으세요", en: "Do you have a point card?", when: "계산 시 포인트 적립 여부를 물어볼 때" },
  { ko: "신분증 확인 부탁드립니다", en: "May I see your ID, please?", when: "술·담배 구매 시 나이를 확인할 때" },
  { ko: "다시 한번 말씀해 주시겠어요", en: "Could you say that again, please?", when: "손님의 말을 못 알아들었을 때" },
];

export function generateKoreanQuizFromSections(sections, { max = 10 } = {}) {
  const fullText = (sections || [])
    .map((s) => [s.title || "", s.body || "", s.i18n?.ko || ""].join("\n"))
    .join("\n")
    .replace(/\s+/g, " ");
  const norm = fullText.replace(/[!?.,'‘’“”"\s]/g, "");

  const questions = [];
  const seen = new Set();
  const add = (item) => {
    if (!item) return;
    if (seen.has(item.q)) return;
    seen.add(item.q);
    questions.push({ ...item, kind: "korean" });
  };

  // 매뉴얼에 등장하는 표현만 대상
  const found = SERVICE_EXPRESSIONS.filter((e) => norm.includes(e.ko.replace(/\s/g, "")));
  const pool = found.length >= 4 ? found : SERVICE_EXPRESSIONS; // 오답 보기용 풀

  for (const e of found) {
    // ① 의미 문항 (영어 뜻)
    add(mcq(`'${e.ko}'의 의미로 알맞은 것은?`, e.en, shuffle(pool.filter((x) => x.ko !== e.ko).map((x) => x.en)).slice(0, 3)));
    if (questions.length >= max) break;
    // ② 상황 문항 (언제 쓰는 표현인가)
    add(mcq(`${e.when} 알맞은 표현은?`, `${e.ko}`, shuffle(pool.filter((x) => x.ko !== e.ko).map((x) => x.ko)).slice(0, 3)));
    if (questions.length >= max) break;
  }

  // ③ 매뉴얼 문장 속 인용구 빈칸 (표현을 실제 문맥에서 확인)
  if (questions.length < max) {
    const quoted = [];
    for (const s of sections || []) {
      const text = [s.body || "", s.i18n?.ko || ""].join("\n");
      for (const m of text.matchAll(/['‘“"]([^'’”"\n]{2,20})['’”"]/g)) quoted.push(m[1].trim());
    }
    const uniq = [...new Set(quoted)];
    for (const s of sections || []) {
      const text = [s.body || "", s.i18n?.ko || ""].join("\n");
      for (const sent of text.split(/\n/).map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x.length >= 10 && x.length <= 120)) {
        const m = sent.match(/['‘“"]([^'’”"\n]{2,20})['’”"]/);
        if (!m) continue;
        const target = m[1].trim();
        const distractors = uniq.filter((x) => x !== target);
        // 사전 표현으로 오답 보강
        if (distractors.length < 3) distractors.push(...SERVICE_EXPRESSIONS.map((x) => x.ko).filter((x) => x !== target));
        add(mcq(`빈칸에 알맞은 표현은?  ${sent.replace(m[0], "『 ____ 』")}`, target, distractors));
        if (questions.length >= max) break;
      }
      if (questions.length >= max) break;
    }
  }

  return questions.slice(0, max);
}
