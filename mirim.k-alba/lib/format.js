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

// "(오전) 8시 00분" / "8시" / "08:00" -> "(오전) 8:00"
function normalizeTime(t) {
  const ampm = (t.match(/\((오전|오후)\)/) || [])[0] || "";
  const hm = t.match(/(\d{1,2})\s*(?::|시)\s*(\d{0,2})/);
  if (!hm) return "";
  const h = String(parseInt(hm[1], 10));
  const mm = (hm[2] || "0").padStart(2, "0");
  return (ampm ? ampm + " " : "") + h + ":" + mm;
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
  const raw = String(job.work_hours || "");
  const days =
    (raw.match(/주\s*\d\s*일|매일/) || [])[0] ||
    String(job.work_days || "").trim();
  const time = extractTimeRange(raw);
  const parts = [days, time].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  const first = raw.split(/\s*\n\s*|\s{2,}/)[0].trim();
  return first && first.length <= 16 ? first : "";
}
