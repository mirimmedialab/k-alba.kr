/**
 * /api/business/verify
 *
 * 사업자등록번호 진위 검증 API.
 * 국세청 NTS API 사용 (공공데이터포털 발급 키 필요).
 *
 * 사용처:
 *   - 회원가입 시 사업주 선택 → 사업자번호 입력 → 자동 검증
 *   - 카카오 봇 check-business 스킬
 *   - 관리자 수동 검증 도구
 *
 * 환경변수: NTS_API_KEY
 */

const NTS_STATUS_API = "https://api.odcloud.kr/api/nts-businessman/v1/status";

/**
 * 사업자번호 형식 정규화 + 검증
 *
 * @param {string} input - "119-86-61402" 또는 "1198661402"
 * @returns {string|null} - 정규화된 10자리 또는 null
 */
export function normalizeBusinessNumber(input) {
  if (!input) return null;
  const digits = String(input).replace(/[^\d]/g, "");
  if (digits.length !== 10) return null;
  return digits;
}

/**
 * 국세청 NTS API로 사업자번호 진위 확인
 *
 * @param {string} businessNumber - 10자리 (정규화 후)
 * @returns {Promise<{valid: boolean, status: string, taxType: string, error?: string}>}
 */
export async function verifyBusinessNumber(businessNumber) {
  const normalized = normalizeBusinessNumber(businessNumber);
  if (!normalized) {
    return { valid: false, error: "사업자번호는 10자리 숫자여야 합니다" };
  }

  const apiKey = process.env.NTS_API_KEY;
  if (!apiKey) {
    return { valid: false, error: "NTS_API_KEY 환경변수 미설정" };
  }

  try {
    const url = `${NTS_STATUS_API}?serviceKey=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ b_no: [normalized] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[NTS API] error:", errText);
      return { valid: false, error: "국세청 API 호출 실패" };
    }

    const data = await res.json();
    const result = data.data?.[0];

    if (!result) {
      return { valid: false, error: "조회 결과가 없습니다" };
    }

    // b_stt_cd: 01 = 계속사업자, 02 = 휴업자, 03 = 폐업자
    if (result.b_stt_cd !== "01") {
      return {
        valid: false,
        status: result.b_stt || "비계속사업자",
        error: `사업 상태가 정상이 아닙니다 (${result.b_stt})`,
      };
    }

    return {
      valid: true,
      status: result.b_stt, // "계속사업자"
      statusCode: result.b_stt_cd, // "01"
      taxType: result.tax_type, // "부가가치세 일반과세자" 등
      taxTypeCode: result.tax_type_cd,
      endDate: result.end_dt, // 폐업일 (없으면 빈 값)
    };
  } catch (e) {
    console.error("[verifyBusinessNumber] error:", e);
    return { valid: false, error: e.message };
  }
}

/**
 * Next.js API 핸들러
 *
 * POST /api/business/verify
 * { businessNumber: "119-86-61402" }
 *
 * 응답:
 * { valid: true, status: "계속사업자", taxType: "부가가치세 일반과세자" }
 *  또는
 * { valid: false, error: "..." }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { businessNumber } = req.body;
    const result = await verifyBusinessNumber(businessNumber);

    if (!result.valid) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("[/api/business/verify] error:", e);
    return res.status(500).json({ valid: false, error: e.message });
  }
}
