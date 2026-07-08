/**
 * 전화번호 자동 하이픈 포맷 (입력 중 실시간 적용)
 *  - 휴대폰(010 등): 3-4-4 → 010-1234-5678
 *  - 서울(02): 02-XXX(X)-XXXX
 *  - 그 외 지역번호 10자리: 3-3-4, 11자리: 3-4-4
 *  숫자 외 문자는 제거, 최대 11자리.
 */
export function formatPhoneInput(value) {
  const d = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (d.startsWith("02")) {
    if (d.length <= 2) return d;
    if (d.length <= 6) return d.slice(0, 2) + "-" + d.slice(2);
    if (d.length <= 10) return d.slice(0, 2) + "-" + d.slice(2, d.length - 4) + "-" + d.slice(d.length - 4);
    return d.slice(0, 2) + "-" + d.slice(2, 6) + "-" + d.slice(6, 10);
  }
  if (d.length <= 3) return d;
  if (d.length <= 7) return d.slice(0, 3) + "-" + d.slice(3);
  if (d.length === 10) return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  return d.slice(0, 3) + "-" + d.slice(3, 7) + "-" + d.slice(7);
}

/** 표시용: 하이픈 없이 저장된 순수 숫자(9~11자리)만 포맷하고, 그 외(이미 하이픈 포함·국제번호 등)는 원본 유지 */
export function formatPhoneDisplay(value) {
  const s = String(value || "").trim();
  return /^\d{9,11}$/.test(s) ? formatPhoneInput(s) : s;
}
