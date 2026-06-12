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
 * 목록 카드용 짧은 근무요일·시간.
 * work_days + work_hours(첫 구간)를 합쳐 한 줄로. 정보 없으면 "".
 */
export function shortWorkTime(job) {
  if (!job) return "";
  const days = String(job.work_days || "").trim();
  const hrs = String(job.work_hours || "").split(/\s*\n\s*|\s{2,}/)[0].trim();
  return [days, hrs].filter(Boolean).join(" · ");
}
