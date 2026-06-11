import { NextResponse } from "next/server";

/**
 * Kakao 역지오코딩 API (좌표 → 주소)
 *
 * POST /api/geocode/reverse
 * Body = { latitude: 37.5012, longitude: 127.0396 }
 *
 * Response = {
 *   ok: true,
 *   address_road: "서울 강남구 테헤란로 152",
 *   address_jibun: "서울 강남구 역삼동 737",
 *   sido: "서울",
 *   sigungu: "강남구",
 *   dong: "역삼동"
 * }
 *
 * 용도:
 *   - GPS로 현재 위치 잡은 뒤 "서울 강남구" 등 표시
 *   - 사장님 공고 등록 시 지도에서 핀 드래그하면 주소 자동 업데이트
 */
export async function POST(request) {
  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { ok: false, error: "좌표가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
    if (!KAKAO_KEY) {
      console.error("[reverse-geocode] KAKAO_REST_API_KEY not configured");
      return NextResponse.json(
        { ok: false, error: "지오코딩 서버가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // Kakao 좌표→주소 API
    const url = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
    url.searchParams.set("x", String(longitude));
    url.searchParams.set("y", String(latitude));

    const response = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`[reverse-geocode] Kakao API ${response.status}`);
      return NextResponse.json(
        { ok: false, error: "주소 변환에 실패했습니다." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const doc = data.documents?.[0];

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "해당 좌표의 주소를 찾을 수 없습니다.", notFound: true },
        { status: 404 }
      );
    }

    const road = doc.road_address;
    const jibun = doc.address;

    return NextResponse.json({
      ok: true,
      address_road: road?.address_name || null,
      address_jibun: jibun?.address_name || null,
      sido: jibun?.region_1depth_name || road?.region_1depth_name || null,
      sigungu: jibun?.region_2depth_name || road?.region_2depth_name || null,
      dong: jibun?.region_3depth_name || road?.region_3depth_name || null,
    });
  } catch (error) {
    console.error("[reverse-geocode] error:", error);
    const isTimeout = error.name === "TimeoutError" || error.name === "AbortError";
    return NextResponse.json(
      {
        ok: false,
        error: isTimeout ? "주소 변환에 시간이 너무 오래 걸립니다." : "주소 변환 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
