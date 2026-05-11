import { NextResponse } from "next/server";

/**
 * POST /api/verify-business
 *
 * 국세청 사업자등록 진위확인 API
 * https://www.data.go.kr/data/15081808/openapi.do
 */
export async function POST(req) {
  try {
    const { businessNumber } = await req.json();

    if (!businessNumber) {
      return NextResponse.json(
        { error: "사업자등록번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 하이픈 제거
    const cleanNumber = businessNumber.replace(/-/g, "");

    // 10자리 숫자 검증
    if (!/^\d{10}$/.test(cleanNumber)) {
      return NextResponse.json(
        { error: "올바른 형식의 사업자등록번호가 아닙니다. (10자리)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NTS_BUSINESS_VERIFY_KEY;

    if (!apiKey) {
      console.error("NTS_BUSINESS_VERIFY_KEY가 설정되지 않았습니다.");
      return NextResponse.json(
        { error: "사업자 인증 서비스가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 국세청 API 호출
    const response = await fetch(
      "https://api.odcloud.kr/api/nts-businessman/v1/status?" +
        new URLSearchParams({
          serviceKey: apiKey,
        }),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          b_no: [cleanNumber],
        }),
      }
    );

    if (!response.ok) {
      console.error("국세청 API 오류:", response.status, response.statusText);
      return NextResponse.json(
        { error: "인증 서버 연결 실패. 잠시 후 다시 시도해주세요." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // 응답 형식:
    // {
    //   "status_code": "OK",
    //   "match_cnt": 1,
    //   "request_cnt": 1,
    //   "data": [{
    //     "b_no": "1234567890",
    //     "b_stt": "계속사업자",
    //     "b_stt_cd": "01",
    //     "tax_type": "부가가치세 일반과세자",
    //     "tax_type_cd": "01",
    //     "end_dt": "",
    //     "utcc_yn": "N",
    //     "tax_type_change_dt": "",
    //     "invoice_apply_dt": "",
    //     "rbf_tax_type": "",
    //     "rbf_tax_type_cd": ""
    //   }]
    // }

    if (data.status_code !== "OK" || !data.data || data.data.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: "등록되지 않은 사업자등록번호입니다."
        },
        { status: 200 }
      );
    }

    const businessInfo = data.data[0];

    // b_stt_cd: 01=계속사업자, 02=휴업자, 03=폐업자
    const isActive = businessInfo.b_stt_cd === "01";

    if (!isActive) {
      return NextResponse.json(
        {
          valid: false,
          error: `해당 사업자는 현재 ${businessInfo.b_stt} 상태입니다.`,
          status: businessInfo.b_stt,
        },
        { status: 200 }
      );
    }

    // 성공
    return NextResponse.json({
      valid: true,
      businessNumber: cleanNumber,
      status: businessInfo.b_stt,
      taxType: businessInfo.tax_type,
    });

  } catch (error) {
    console.error("사업자 인증 오류:", error);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
