// 이력서 텍스트 → 구조화 초안 파서 (ko/en 휴리스틱)

// ── 섹션 휴리스틱 파서 (ko/en 키워드) ──
const SECTION_KEYS = [
  { key: "experiences", re: /^(경력|경력\s*사항|근무\s*경력|알바\s*경력|work\s*experience|experience|employment)/i },
  { key: "education", re: /^(학력|학력\s*사항|education|academic)/i },
  { key: "skills", re: /^(기술|보유\s*기술|스킬|핵심\s*역량|skills?|competenc)/i },
  { key: "languages", re: /^(언어|어학|외국어|language)/i },
  { key: "certificates", re: /^(자격증?|자격\s*사항|certificat|license)/i },
  { key: "intro", re: /^(자기\s*소개|소개|about\s*me|introduction|summary|profile)/i },
];

const DATE_RANGE = /((19|20)\d{2})[.\/\-년\s]{0,3}(\d{1,2})?[.\/\-월\s]*[~\-–—]\s*(((19|20)\d{2})([.\/\-년\s]{0,3}\d{1,2})?[월.\s]*|현재|재직중|재학중|present|now)?/i;
const LANG_LEVEL = /(원어민|native|유창|fluent|business|비즈니스|중급|intermediate|초급|basic|beginner|topik\s*\d|급)/i;

export function parseResumeText(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const sections = { intro: [], experiences: [], education: [], skills: [], languages: [], certificates: [], _head: [] };
  let cur = "_head";
  for (const line of lines) {
    const hit = SECTION_KEYS.find((s) => s.re.test(line.replace(/^[#\d.\s■●○▪◦*\-]+/, "")));
    if (hit && line.length < 30) { cur = hit.key; continue; }
    sections[cur].push(line);
  }

  // 경력: 날짜 범위가 있는 줄을 항목 시작으로 그룹핑
  const experiences = [];
  let exp = null;
  for (const line of sections.experiences) {
    if (DATE_RANGE.test(line)) {
      if (exp) experiences.push(exp);
  // 지역 추정: 한글이 포함된 근무처는 한국 경력, 아니면 자국 경력으로 초기 분류 (사용자가 수정 가능)
  for (const e of experiences) {
    e.region = /[가-힣]/.test(e.place || "") ? "korea" : "home";
  }
      const period = (line.match(DATE_RANGE) || [""])[0].trim();
      const rest = line.replace(DATE_RANGE, "").replace(/[|·,]/g, " ").trim();
      exp = { place: rest.slice(0, 60) || "", role: "", period, description: "" };
    } else if (exp) {
      if (!exp.role && line.length < 30) exp.role = line;
      else exp.description = (exp.description ? exp.description + " " : "") + line;
    } else {
      exp = { place: line.slice(0, 60), role: "", period: "", description: "" };
    }
  }
  if (exp) experiences.push(exp);

  // 학력
  const education = [];
  for (const line of sections.education) {
    const period = (line.match(DATE_RANGE) || [""])[0].trim();
    const rest = line.replace(DATE_RANGE, "").replace(/[|·,]/g, " ").trim();
    if (rest) education.push({ school: rest.slice(0, 60), major: "", period, status: /졸업|graduat/i.test(line) ? "졸업" : /재학|attending|enrolled/i.test(line) ? "재학" : "" });
  }

  // 기술/자격증: 구분자 분리
  const splitList = (arr) =>
    arr.join(",").split(/[,、·•|/]+/).map((s) => s.trim()).filter((s) => s && s.length <= 40).slice(0, 20);
  const skills = splitList(sections.skills);
  const certificates = splitList(sections.certificates);

  // 언어
  const languages = [];
  for (const line of sections.languages) {
    for (const part of line.split(/[,、·•|/]+/)) {
      const p = part.trim();
      if (!p) continue;
      const levelM = p.match(LANG_LEVEL);
      const lang = p.replace(LANG_LEVEL, "").replace(/[():\-\d]/g, "").replace(/^급|급$/g, "").trim().slice(0, 20);
      if (lang) languages.push({ lang, level: levelM ? levelM[0] : "" });
    }
  }

  const intro = sections.intro.join(" ").slice(0, 600) || sections._head.slice(0, 4).join(" ").slice(0, 300);

  return {
    intro,
    skills,
    languages: languages.slice(0, 8),
    experiences: experiences.slice(0, 10),
    education: education.slice(0, 5),
    certificates,
  };
}

