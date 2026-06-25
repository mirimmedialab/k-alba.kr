import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/verify-business
 *
 * 국세청 사업자등록 진위확인 API (validate 버전)
 * https://www.data.go.kr/data/15081808/openapi.do
 *
 * 대표자명과 개업일자까지 확인하여 정확한 인증
 */
export async function POST(req) {
  try {
    const { businessNumber, representativeName, openingDate } = await req.json();

    if (!businessNumber) {
      return NextResponse.json(
        { error: "사업자등록번호를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!representativeName) {
      return NextResponse.json(
        { error: "대표자명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!openingDate) {
      return NextResponse.json(
        { error: "개업일자를 입력해주세요." },
        { status: 400 }
      );
    }

    // 하이픈 제거
    const cleanNumber = businessNumber.replace(/-/g, "");
    const cleanDate = openingDate.replace(/-/g, "");

    // 10자리 숫자 검증
    if (!/^\d{10}$/.test(cleanNumber)) {
      return NextResponse.json(
        { error: "올바른 형식의 사업자등록번호가 아닙니다. (10자리)" },
        { status: 400 }
      );
    }

    // 개업일자 8자리 검증 (YYYYMMDD)
    if (!/^\d{8}$/.test(cleanDate)) {
      return NextResponse.json(
        { error: "올바른 형식의 개업일자가 아닙니다. (YYYYMMDD)" },
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

    // 국세청 API 호출 (validate: 대표자명 + 개업일자 검증)
    const response = await fetch(
      "https://api.odcloud.kr/api/nts-businessman/v1/validate?" +
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
          businesses: [
            {
              b_no: cleanNumber,
              p_nm: representativeName,
              start_dt: cleanDate,
            },
          ],
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

    // 응답 형식 (validate):
    // {
    //   "status_code": "OK",
    //   "match_cnt": 1,
    //   "request_cnt": 1,
    //   "data": [{
    //     "b_no": "1234567890",
    //     "valid": "01",        // 01=일치, 02=불일치
    //     "valid_msg": "일치",
    //     "request_param": {
    //       "b_no": "1234567890",
    //       "p_nm": "홍길동",
    //       "start_dt": "20200101"
    //     },
    //     "status": {
    //       "b_no": "1234567890",
    //       "b_stt": "계속사업자",
    //       "b_stt_cd": "01",
    //       "tax_type": "부가가치세 일반과세자",
    //       "tax_type_cd": "01",
    //       "end_dt": "",
    //       "utcc_yn": "N",
    //       "tax_type_change_dt": "",
    //       "invoice_apply_dt": ""
    //     }
    //   }]
    // }

    if (data.status_code !== "OK" || !data.data || data.data.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: "인증 서버 응답 오류. 잠시 후 다시 시도해주세요."
        },
        { status: 200 }
      );
    }

    const businessInfo = data.data[0];

    // valid: "01" = 일치, "02" = 불일치
    if (businessInfo.valid !== "01") {
      return NextResponse.json(
        {
          valid: false,
          error: "사업자 정보가 일치하지 않습니다. 사업자등록번호, 대표자명, 개업일자를 확인해주세요.",
        },
        { status: 200 }
      );
    }

    // 사업자 상태 확인
    const status = businessInfo.status;
    if (!status) {
      return NextResponse.json(
        {
          valid: false,
          error: "사업자 상태 정보를 확인할 수 없습니다."
        },
        { status: 200 }
      );
    }

    // b_stt_cd: 01=계속사업자, 02=휴업자, 03=폐업자
    const isActive = status.b_stt_cd === "01";

    if (!isActive) {
      return NextResponse.json(
        {
          valid: false,
          error: `해당 사업자는 현재 ${status.b_stt} 상태입니다.`,
          businessStatus: status.b_stt,
        },
        { status: 200 }
      );
    }

    // 국세청 인증 통과 → (로그인 토큰이 있으면) 서버에서 verified 저장.
    // 서비스롤로 직접 기록하므로 RLS/세션 타이밍 영향 없이 확실히 저장되고, 프론트 우회도 방지된다.
    let persisted = false;
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const sbUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && serviceKey) {
        try {
          const svc = createClient(sbUrl, serviceKey, { auth: { persistSession: false } });
          const { data: userData } = await svc.auth.getUser(token);
          const uid = userData?.user?.id;
          if (uid) {
            // upsert: profiles 행이 없을 수도 있어 update면 0건으로 조용히 실패한다(link-kakao와 동일 패턴)
            const { error: upErr } = await svc
              .from("profiles")
              .upsert(
                {
                  id: uid,
                  email: userData.user.email,
                  user_type: "employer",
                  verified: true,
                  business_number: cleanNumber,
                  name: representativeName,
                },
                { onConflict: "id" }
              );
            persisted = !upErr;
          }
        } catch (_) { /* 저장 실패해도 검증 결과는 반환 */ }
      }
    }

    // 성공
    return NextResponse.json({
      valid: true,
      persisted,
      businessNumber: cleanNumber,
      representativeName: representativeName,
      openingDate: cleanDate,
      status: status.b_stt,
      taxType: status.tax_type,
    });

  } catch (error) {
    console.error("사업자 인증 오류:", error);
    return NextResponse.json(
      { error: "인증 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
