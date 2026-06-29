/**
 * 급여/근무시간 표기 포맷터
 */

/**
 * 금액을 한국식 만/억 단위로 표기.
 * - 시급(payType === "시급") 또는 1만원 미만: 원 단위 그대로 ("10,320원")
 * - 그 외(월급/연봉 등): 만/억 단위 ("260만원", "3,000만원", "1억 200만원")
 */
export function formatPay(amount, payType) {
  const n = Number(amount) || 0;
  if (payType === "시급" || n < 10000) return n.toLocaleString() + "원";
  const eok = Math.floor(n / 100000000);
  const man = Math.round((n % 100000000) / 10000);
  let s = "";
  if (eok) s += eok + "억";
  if (man) s += (s ? " " : "") + man.toLocaleString() + "만";
  if (!s) s = n.toLocaleString();
  return s + "원";
}

/**
 * 등록 일시 표기 (최신순 목록용). 모든 언어 공통으로 안전한 숫자 포맷.
 * - 올해: "MM.DD HH:mm" (예: "06.29 14:30")
 * - 작년 이전: "YYYY.MM.DD HH:mm"
 */
export function formatPostedAt(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const p = (x) => String(x).padStart(2, "0");
  const datePart =
    d.getFullYear() === now.getFullYear()
      ? `${p(d.getMonth() + 1)}.${p(d.getDate())}`
      : `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
  return `${datePart} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "(오전) 8시 00분" / "8시" / "08:00" / "17:00" -> "(오전) 8:00" / "(오후) 5:00"
// 오전/오후 표기가 없으면 24시간제로 보고 오전·오후 + 12시간제로 변환
function normalizeTime(t) {
  const ampm = (t.match(/\((오전|오후)\)/) || [])[1] || "";
  const hm = t.match(/(\d{1,2})\s*(?::|시)\s*(\d{0,2})/);
  if (!hm) return "";
  let h = parseInt(hm[1], 10);
  const mm = (hm[2] || "0").padStart(2, "0");
  let label = ampm;
  if (h === 0) { label = "오전"; h = 12; }
  else if (h > 12) { label = "오후"; h -= 12; }
  else if (h === 12) { label = label || "오후"; }
  else if (!label) { label = "오전"; }
  return `(${label}) ${h}:${mm}`;
}

// 자유 텍스트에서 "시간 ~ 시간" (또는 "시간 - 시간") 구간만 추출.
// 양쪽이 모두 시간일 때만 매칭 → "월~금" 같은 요일 범위는 무시.
function extractTimeRange(raw) {
  const T = "(?:\\((?:오전|오후)\\)\\s*)?\\d{1,2}\\s*(?::|시)\\s*\\d{0,2}\\s*분?";
  const m = raw.match(new RegExp(`(${T})\\s*[~∼〜～\\-]\\s*(${T})`));
  if (!m) return "";
  const start = normalizeTime(m[1]);
  const end = normalizeTime(m[2]);
  if (!start || !end) return "";
  return `${start} ~ ${end}`;
}

/**
 * 목록 카드용 짧은 근무요일·시간.
 * - 근무시간 원문에서 시간 범위(~ 기준)만 깔끔히 추출
 * - "주 N일" / "매일" 같은 짧은 요일만 함께 표시
 * - 그 외 텍스트(평균근무시간 등)는 모두 생략
 */
export function shortWorkTime(job) {
  if (!job) return "";
  const raw = String(job.work_hours || job.hours || "");
  const days =
    (raw.match(/주\s*\d\s*일|매일/) || [])[0] ||
    String(job.work_days || job.days || "").trim();
  const time = extractTimeRange(raw);
  const parts = [days, time].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  const first = raw.split(/\s*\n\s*|\s{2,}/)[0].trim();
  return first && first.length <= 16 ? first : "";
}

/**
 * 상세 페이지용 근무시간 포맷.
 * 공백을 정리하고, 절(시간대/휴게시간/요일) 경계에서만 줄바꿈해 배열로 반환.
 * 괄호 안 내용(점심시간/석식시간 등)은 한 줄에 유지.
 */
export function formatWorkHours(raw) {
  let s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s) return [];
  s = s
    .replace(/\s*(휴게시간\s*[:：])/g, "\n$1")
    .replace(/\s*(주\s*\d\s*일\s*근무|매일)/g, "\n$1")
    .replace(/\s*(평일|월요일|화요일|수요일|목요일|금요일|토요일|일요일|주말)/g, "\n$1")
    .replace(/(?<!~)(?<!~ )(\(오전\)|\(오후\))/g, "\n$1");
  return s.split("\n").map((x) => x.trim()).filter(Boolean);
}

/**
 * 근무시간/요일 문자열을 로케일 단어로 치환(한국어 토큰 → 번역어).
 * 시간은 "8시 30분" → "8:30" 으로 통일. t는 useT()의 t.
 */
export function localizeWorkText(line, t) {
  if (!line) return line;
  let s = String(line);
  // 시각: "8시 30분" -> "8:30", "8시" -> "8:00"
  s = s.replace(/(\d{1,2})\s*시\s*(\d{1,2})\s*분/g, (m, h, mi) => h + ":" + String(mi).padStart(2, "0"));
  s = s.replace(/(\d{1,2})\s*시/g, "$1:00");
  // 오전/오후
  s = s.replace(/\(?\s*오전\s*\)?/g, t("wh.am") + " ");
  s = s.replace(/\(?\s*오후\s*\)?/g, t("wh.pm") + " ");
  // 주 N일 (근무)
  s = s.replace(/주\s*(\d+)\s*일(\s*근무)?/g, (m, n) => t("wh.daysPerWeek", { n }));
  // 라벨/단어 (긴 토큰 먼저)
  s = s.replace(/평균\s*근무\s*시간/g, t("wh.avgWeeklyHours"));
  s = s.replace(/근무\s*시간/g, t("wh.workHours"));
  s = s.replace(/휴게\s*시간/g, t("wh.breakTime"));
  s = s.replace(/매일/g, t("wh.everyday"));
  s = s.replace(/평일/g, t("wh.weekday"));
  s = s.replace(/주말/g, t("wh.weekend"));
  s = s.replace(/요일\s*협의|협의/g, t("wh.negotiable"));
  s = s.replace(/\s+:\s+/g, ": ").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  return s;
}
