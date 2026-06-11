import { NextResponse } from "next/server";

/**
 * Kakao 지오코딩 API 프록시
 *
 * POST /api/geocode/address
 * Body = { address: "서울 강남구 테헤란로 152" }
 *
 * Response = {
 *   ok: true,
 *   latitude: 37.500287,
 *   longitude: 127.036515,
 *   address_road: "서울 강남구 테헤란로 152",
 *   address_jibun: "서울 강남구 역삼동 737",
 *   sido: "서울",
 *   sigungu: "강남구",
 *   dong: "역삼동"
 * }
 *
 * 환경변수 필요:
 *   KAKAO_REST_API_KEY (Kakao Developers 앱의 REST API 키)
 *
 * 발급: https://developers.kakao.com/console/app
 *   1. 내 애플리케이션 → 앱 키
 *   2. REST API 키 복사
 *   3. .env.local 에 KAKAO_REST_API_KEY=... 추가
 *   4. Vercel 환경변수에도 동일 추가
 */
export async function POST(request) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { ok: false, error: "주소가 필요합니다." },
        { status: 400 }
      );
    }

    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_KEY) {
      console.error("[geocode] KAKAO_REST_API_KEY not configured");
      return NextResponse.json(
        { ok: false, error: "지오코딩 서버가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
    url.searchParams.set("query", address);
    url.searchParams.set("size", "1"); // 상위 1건만

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${KAKAO_KEY}`,
      },
      // 5초 타임아웃
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[geocode] Kakao API ${response.status}`);
      return NextResponse.json(
        { ok: false, error: "주소 검색 서비스에 문제가 발생했습니다." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const doc = data.documents?.[0];

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "주소를 찾을 수 없습니다.", notFound: true },
        { status: 404 }
      );
    }

    // 도로명 주소 우선, 없으면 지번 주소 사용
    const roadAddr = doc.road_address;
    const jibunAddr = doc.address;

    const result = {
      ok: true,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      address_road: roadAddr?.address_name || null,
      address_jibun: jibunAddr?.address_name || null,
      sido: jibunAddr?.region_1depth_name || roadAddr?.region_1depth_name || null,
      sigungu: jibunAddr?.region_2depth_name || roadAddr?.region_2depth_name || null,
      dong: jibunAddr?.region_3depth_name || roadAddr?.region_3depth_name || null,
      postal_code: roadAddr?.zone_no || null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[geocode] error:", error);
    const isTimeout = error.name === "TimeoutError" || error.name === "AbortError";
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout
          ? "주소 검색에 시간이 너무 오래 걸립니다."
          : "주소 검색 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
