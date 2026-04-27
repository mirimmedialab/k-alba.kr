import { NextResponse } from "next/server";

/**
 * 이동수단별 경로 API (Kakao Mobility + T맵)
 *
 * POST /api/directions
 * Body = {
 *   origin:      { latitude, longitude },
 *   destination = { latitude, longitude },
 *   modes: ["driving", "walking", "transit", "cycling"]
 * }
 *
 * 데이터 소스:
 *   driving  → Kakao Mobility API (월 1만건 무료)
 *   transit  → T맵 대중교통 API (월 5만건 무료)
 *   walking  → T맵 보행자 경로 API (정확한 도보 경로)
 *   cycling  → 하버사인 기반 근사 (T맵은 자전거 API 없음)
 *
 * 환경변수:
 *   KAKAO_REST_API_KEY   (기존)
 *   TMAP_APP_KEY         (신규 — SK Open API 센터에서 발급)
 *
 * T맵 API 키 발급:
 *   https://openapi.sk.com → 회원가입 → 앱 등록 → AppKey 복사
 *   무료 플랜: 월 5만건 (대중교통 + 보행자 합산)
 *
 * fallback 전략:
 *   T맵 실패 → 하버사인 근사치 (기존 로직)
 *   Kakao Mobility 실패 → 하버사인 × 1.3 × 40km/h 근사
 */

// ────────── 거리 계산 유틸 ──────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTaxiFee(meters) {
  if (meters < 2000) return 4800;
  return Math.round(4800 + ((meters - 2000) / 100) * 100);
}

function estimateCycling(meters) {
  return {
    duration_sec: Math.round(meters / 4.2), // 15km/h
    distance_m: Math.round(meters),
  };
}

// ────────── Kakao Mobility (자동차) ──────────
async function fetchDriving(origin, destination) {
  const KEY = process.env.KAKAO_REST_API_KEY;
  if (!KEY) return null;

  const url = new URL("https://apis-navi.kakaomobility.com/v1/directions");
  url.searchParams.set("origin", `${origin.longitude},${origin.latitude}`);
  url.searchParams.set("destination", `${destination.longitude},${destination.latitude}`);
  url.searchParams.set("priority", "RECOMMEND");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route || route.result_code !== 0) return null;
    const s = route.summary;
    return {
      duration_sec: s.duration,
      distance_m: s.distance,
      taxi_fee: s.fare?.taxi || estimateTaxiFee(s.distance),
      toll_fee: s.fare?.toll || 0,
      source: "kakao",
    };
  } catch (e) {
    console.error("[directions] driving failed:", e.message);
    return null;
  }
}

// ────────── T맵 대중교통 ──────────
async function fetchTransit(origin, destination) {
  const KEY = process.env.TMAP_APP_KEY;
  if (!KEY) return null;

  try {
    const res = await fetch(
      "https://apis.openapi.sk.com/transit/routes",
      {
        method: "POST",
        headers: {
          appKey: KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          startX: String(origin.longitude),
          startY: String(origin.latitude),
          endX: String(destination.longitude),
          endY: String(destination.latitude),
          lang: 0,
          format: "json",
          count: 1,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) {
      // 400: 출발지/도착지 너무 가까움 (T맵은 이 경우 에러)
      // 403: API 키 인증 실패
      if (res.status === 400) {
        return {
          duration_sec: 300,
          distance_m: 500,
          transfers: 0,
          too_close: true,
          source: "tmap_fallback",
        };
      }
      return null;
    }

    const data = await res.json();
    const plan = data.metaData?.plan?.itineraries?.[0];
    if (!plan) return null;

    // 구간 요약: 지하철/버스/도보 정보 추출
    const legs = (plan.legs || []).map((leg) => ({
      mode: leg.mode, // "SUBWAY" | "BUS" | "WALK" | "TRANSFER"
      sectionTime: leg.sectionTime,
      distance: leg.distance,
      route: leg.route || null,
      routeColor: leg.routeColor || null,
      startStation: leg.start?.name || null,
      endStation: leg.end?.name || null,
      passStations: leg.passStopList?.stationList?.length || 0,
    }));

    // 환승 횟수 계산 (TRANSFER mode 또는 mode 변경 횟수)
    const vehicleLegs = legs.filter((l) =>
      l.mode === "SUBWAY" || l.mode === "BUS"
    );
    const transfers = Math.max(0, vehicleLegs.length - 1);

    // 가장 가까운 역 (첫 번째 지하철 구간의 출발역)
    const firstSubway = legs.find((l) => l.mode === "SUBWAY");

    return {
      duration_sec: plan.totalTime,
      distance_m: plan.totalDistance,
      transfers,
      walk_time_sec: plan.totalWalkTime || 0,
      walk_distance_m: plan.totalWalkDistance || 0,
      fare: plan.fare?.regular?.totalFare || 0,
      legs,
      nearest_station: firstSubway?.startStation || null,
      source: "tmap",
    };
  } catch (e) {
    console.error("[directions] transit failed:", e.message);
    return null;
  }
}

// ────────── T맵 보행자 ──────────
async function fetchWalking(origin, destination) {
  const KEY = process.env.TMAP_APP_KEY;

  // 거리가 너무 멀면 (20km 이상) 도보는 의미 없음 → 근사치로
  const straight = haversineDistance(
    origin.latitude, origin.longitude,
    destination.latitude, destination.longitude
  );
  if (straight > 20000) {
    return {
      duration_sec: Math.round((straight * 1.2) / 1.1),
      distance_m: Math.round(straight * 1.2),
      source: "estimated",
    };
  }

  if (!KEY) {
    return {
      duration_sec: Math.round((straight * 1.2) / 1.1),
      distance_m: Math.round(straight * 1.2),
      source: "estimated",
    };
  }

  try {
    const res = await fetch(
      "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json",
      {
        method: "POST",
        headers: {
          appKey: KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          startX: origin.longitude,
          startY: origin.latitude,
          endX: destination.longitude,
          endY: destination.latitude,
          startName: "출발지",
          endName: "도착지",
          searchOption: 0, // 0: 추천
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) {
      return {
        duration_sec: Math.round((straight * 1.2) / 1.1),
        distance_m: Math.round(straight * 1.2),
        source: "estimated",
      };
    }

    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.properties) return null;

    return {
      duration_sec: feature.properties.totalTime,
      distance_m: feature.properties.totalDistance,
      source: "tmap",
    };
  } catch (e) {
    return {
      duration_sec: Math.round((straight * 1.2) / 1.1),
      distance_m: Math.round(straight * 1.2),
      source: "estimated",
    };
  }
}

// ────────── 메인 핸들러 ──────────
export async function POST(request) {
  try {
    const { origin, destination, modes = ["driving", "transit", "walking", "cycling"] } = await request.json();

    if (!origin?.latitude || !destination?.latitude) {
      return NextResponse.json(
        { ok: false, error: "출발지 또는 도착지 좌표가 없습니다." },
        { status: 400 }
      );
    }

    const straightDistance = haversineDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    );

    const result = {
      ok: true,
      straight_distance_m: Math.round(straightDistance),
      driving: null,
      walking: null,
      cycling: null,
      transit: null,
    };

    // 병렬 호출
    const tasks = [];

    if (modes.includes("driving")) {
      tasks.push(
        fetchDriving(origin, destination).then((r) => {
          result.driving = r || {
            duration_sec: Math.round(straightDistance / 11.1 + 300),
            distance_m: Math.round(straightDistance * 1.3),
            taxi_fee: estimateTaxiFee(straightDistance),
            toll_fee: 0,
            source: "estimated",
          };
        })
      );
    }

    if (modes.includes("transit")) {
      tasks.push(
        fetchTransit(origin, destination).then((r) => {
          if (r) {
            result.transit = r;
          } else {
            // T맵 실패 시 근사치
            const meters = straightDistance;
            let duration, transfers;
            if (meters < 500) {
              duration = Math.round(meters / 1.1);
              transfers = 0;
            } else if (meters < 2000) {
              duration = Math.round(meters / 5.5 + 300);
              transfers = 0;
            } else if (meters < 10000) {
              duration = Math.round(meters / 6.1 + 600);
              transfers = 1;
            } else {
              duration = Math.round(meters / 6.9 + 900);
              transfers = 2;
            }
            result.transit = {
              duration_sec: duration,
              distance_m: Math.round(meters),
              transfers,
              source: "estimated",
            };
          }
        })
      );
    }

    if (modes.includes("walking")) {
      tasks.push(fetchWalking(origin, destination).then((r) => (result.walking = r)));
    }

    if (modes.includes("cycling")) {
      result.cycling = { ...estimateCycling(straightDistance * 1.15), source: "estimated" };
    }

    await Promise.all(tasks);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[directions] error:", error);
    return NextResponse.json(
      { ok: false, error: "경로 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
