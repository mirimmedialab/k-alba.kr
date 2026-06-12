/**
 * GET /api/jobs/worknet-detail?authNo=<wantedAuthNo>&infoSvc=VALIDATION
 *
 * 고용24(work24) 채용정보 "상세조회" API(callTp=D)를 서버에서 호출해
 * 목록 API에는 없는 전체 제목·상세설명·근무시간 등을 가져온다.
 *
 * 목록 API(callOpenApiSvcInfo210L01)는 title 을 30자에서 "..."로 자르고
 * 상세설명(jobCont)이 없으므로, 공고 상세 페이지에서 이 라우트로 보강한다.
 *
 * 환경변수: WORKNET_API_KEY (고용24 OpenAPI 인증키)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DETAIL_URL =
  "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do";

function unescapeXml(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x9;/gi, " ")
    .replace(/&#xa;/gi, "\n")
    .replace(/&#xd;/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function field(xml, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? unescapeXml(m[1]) : "";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const authNo = searchParams.get("authNo");
  const infoSvc = searchParams.get("infoSvc") || "VALIDATION";

  if (!authNo) {
    return Response.json({ error: "authNo required" }, { status: 400 });
  }
  const apiKey = process.env.WORKNET_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "WORKNET_API_KEY missing" }, { status: 500 });
  }

  const params = new URLSearchParams({
    authKey: apiKey,
    callTp: "D",
    returnType: "XML",
    infoSvc, // 정보제공처 (목록의 infoSvc, 보통 VALIDATION)
    wantedAuthNo: authNo,
  });

  try {
    const res = await fetch(`${DETAIL_URL}?${params.toString()}`, {
      cache: "no-store",
    });
    const xml = await res.text();

    if (!xml.includes("<wantedDtl>")) {
      // 에러 메시지(messageCd 등) 또는 빈 응답
      return Response.json(
        { error: "detail_not_found", raw: xml.slice(0, 200) },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      title: field(xml, "wantedTitle"), // 전체 제목 (미절삭)
      description: field(xml, "jobCont"), // 상세 직무내용
      company: field(xml, "corpNm"),
      work_hours: field(xml, "workdayWorkhrCont"), // 근무요일·시간 설명
      welfare: field(xml, "etcWelfare"),
      four_ins: field(xml, "fourIns"),
      preferential: field(xml, "pfCond"),
      headcount: field(xml, "collectPsncnt"),
      pay: field(xml, "salTpNm"),
      detail_url: field(xml, "dtlRecrContUrl"),
    });
  } catch (e) {
    return Response.json(
      { error: e?.message || "fetch failed" },
      { status: 500 }
    );
  }
}
