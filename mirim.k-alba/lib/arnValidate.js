// 외국인등록번호(ARN) 유효성 검증
//
// 검증 단계:
//   1. 형식: 13자리 숫자 (YYMMDD-NXXXXXX)
//   2. 생년월일: 앞 6자리가 실제 존재하는 날짜인지 (7번째 자리로 세기 판정)
//   3. 외국인 코드: 7번째 자리가 5·6·7·8 인지 (내국인 1~4는 주민등록번호)
//   4. 체크섬: 마지막 자리 검증
//      - 2020년 10월 이후 발급분: 내국인 주민번호와 동일 공식 (11 - 가중합%11) % 10
//      - 이전 발급분: 구 공식 ((11 - 가중합%11) % 10 + 2) % 10
//      두 방식 중 하나라도 맞으면 통과 (신·구 번호 혼재 대응)
//
// 사용:
//   const { valid, reason } = validateAlienRegNo("123456-1234567");
//   reason: "length" | "birthdate" | "foreigner_code" | "checksum" | null

export function formatArn(value) {
  const digits = String(value || "").replace(/[^0-9]/g, "").slice(0, 13);
  return digits.length > 6 ? `${digits.slice(0, 6)}-${digits.slice(6)}` : digits;
}

export function validateAlienRegNo(value) {
  const d = String(value || "").replace(/[^0-9]/g, "");

  if (d.length !== 13) return { valid: false, reason: "length" };

  const nums = d.split("").map(Number);
  const genderCode = nums[6];

  // 외국인 코드 (5=1900년대 남, 6=1900년대 여, 7=2000년대 남, 8=2000년대 여)
  if (![5, 6, 7, 8].includes(genderCode)) {
    return { valid: false, reason: "foreigner_code" };
  }

  // 생년월일 실존 여부
  const century = genderCode <= 6 ? 1900 : 2000;
  const year = century + Number(d.slice(0, 2));
  const month = Number(d.slice(2, 4));
  const day = Number(d.slice(4, 6));
  const date = new Date(year, month - 1, day);
  if (
    month < 1 || month > 12 ||
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day ||
    date > new Date()
  ) {
    return { valid: false, reason: "birthdate" };
  }

  // 체크섬 (신·구 방식 모두 허용)
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  const sum = weights.reduce((acc, w, i) => acc + w * nums[i], 0);
  const base = (11 - (sum % 11)) % 10;
  const newStyle = base;                 // 2020.10 이후 발급 (내국인 동일)
  const oldStyle = (base + 2) % 10;      // 이전 발급 (+2 보정)
  if (nums[12] !== newStyle && nums[12] !== oldStyle) {
    return { valid: false, reason: "checksum" };
  }

  return { valid: true, reason: null };
}

// 사용자에게 보여줄 에러 문구 (한국어 기본)
export function arnErrorMessage(reason) {
  switch (reason) {
    case "length":
      return "외국인등록번호는 13자리여야 해요. (예: 123456-1234567)";
    case "foreigner_code":
      return "7번째 자리가 외국인등록번호 형식(5·6·7·8)이 아니에요. 외국인등록증의 번호를 다시 확인해 주세요.";
    case "birthdate":
      return "앞 6자리가 올바른 생년월일(YYMMDD)이 아니에요. 다시 확인해 주세요.";
    case "checksum":
      return "번호가 올바르지 않아요. 외국인등록증의 번호를 한 자리씩 다시 확인해 주세요.";
    default:
      return "외국인등록번호를 다시 확인해 주세요.";
  }
}
