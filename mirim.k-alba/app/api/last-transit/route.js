import { NextResponse } from "next/server";

/**
 * 막차 시간 체크 API (야간 알바용)
 *
 * POST /api/last-transit
 * Body = {
 *   from:       { latitude, longitude },   // 근무지
 *   to:         { latitude, longitude },   // 집
 *   workEndAt:  "23:00"                    // 근무 종료 시각
 * }
 *
 * Response = {
 *   ok: true,
 *   can_return: true,                       // 막차 타고 집에 갈 수 있는가
 *   risk_level: "safe" | "tight" | "danger" | "impossible",
 *   last_subway_time: "24:12",              // 근처 역 막차 시간
 *   last_bus_time: "23:30",
 *   warning_message: "...",                 // 사용자에게 보여줄 메시지
 *   alternatives: [                         // 대안
 *     { type: "night_bus", label: "심야버스 N15", time: "00:30" },
 *     { type: "taxi", label: "택시", cost: 18000 }
 *   ]
 * }
 *
 * 외국인에게 중요한 이유:
 *   - 한국어로 막차 정보 찾기 어려움
 *   - 다른 지역에서 서울까지 왔다가 못 돌아가는 상황 빈번
 *   - 야간 알바 수락 전 결정적 정보
 *
 * 데이터 소스:
 *   - 지하철 막차: 기본값 내장 (서울·부산·인천·대전 평균)
 *   - 상세 실시간: T맵 대중교통 API에서 마지막 출발 시각 조회
 */

// ────────── 기본 막차 시간 (서울 기준 근사치) ──────────
// 실제로는 역마다 다르지만, MVP에서는 평균값
const DEFAULT_LAST_TIMES = {
  subway: {
    seoul:   { weekday: "24:12", weekend: "23:52" },
    busan:   { weekday: "23:55", weekend: "23:30" },
    incheon: { weekday: "24:00", weekend: "23:35" },
    other:   { weekday: "23:30", weekend: "23:00" },
  },
  bus: {
    general: { weekday: "23:30", weekend: "23:00" },
    express: { weekday: "22:30", weekend: "22:00" },
  },
  night_bus: {
    // 서울 심야버스 (N노선) — 한국어 모르는 외국인에게 귀중
    seoul: [
      { route: "N15", time: "00:30", area: "강남~영등포" },
      { route: "N16", time: "00:30", area: "도봉~서울역" },
      { route: "N37", time: "00:30", area: "송파~강서" },
      { route: "N51", time: "00:30", area: "중랑~양천" },
      { route: "N61", time: "00:30", area: "노원~영등포" },
      { route: "N62", time: "00:30", area: "양천~면목" },
    ],
  },
};

// ────────── 지역 판별 (대략) ──────────
function detectRegion(latitude, longitude) {
  // 서울: 37.4~37.7, 126.8~127.2
  if (latitude >= 37.4 && latitude <= 37.7 && longitude >= 126.8 && longitude <= 127.2) {
    return "seoul";
  }
  // 부산: 35.0~35.3, 128.9~129.3
  if (latitude >= 35.0 && latitude <= 35.3 && longitude >= 128.9 && longitude <= 129.3) {
    return "busan";
  }
  // 인천: 37.3~37.6, 126.4~126.8
  if (latitude >= 37.3 && latitude <= 37.6 && longitude >= 126.4 && longitude <= 126.8) {
    return "incheon";
  }
  return "other";
}

// ────────── 시간 유틸 ──────────
function parseTime(hhmm) {
  // "24:12" 같은 형식 (24시 이상 허용)
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

// ────────── T맵 대중교통으로 실제 경로 소요시간 확인 ──────────
async function fetchTransitDuration(from, to) {
  const KEY = process.env.TMAP_APP_KEY;
  if (!KEY) return null;

  try {
    const res = await fetch("https://apis.openapi.sk.com/transit/routes", {
      method: "POST",
      headers: {
        appKey: KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startX: String(from.longitude),
        startY: String(from.latitude),
        endX: String(to.longitude),
        endY: String(to.latitude),
        lang: 0,
        format: "json",
        count: 1,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.metaData?.plan?.itineraries?.[0]?.totalTime || null;
  } catch {
    return null;
  }
}

// ────────── 메인 핸들러 ──────────
export async function POST(request) {
  try {
    const { from, to, workEndAt } = await request.json();

    if (!from?.latitude || !to?.latitude || !workEndAt) {
      return NextResponse.json(
        { ok: false, error: "근무지, 집 좌표, 종료 시각이 필요합니다." },
        { status: 400 }
      );
    }

    // 근무 종료 시각 파싱
    const workEndMin = parseTime(workEndAt);

    // 지역 판별
    const region = detectRegion(from.latitude, from.longitude);
    const weekend = isWeekend();
    const dayKey = weekend ? "weekend" : "weekday";

    // 막차 시간 가져오기
    const lastSubwayStr = DEFAULT_LAST_TIMES.subway[region]?.[dayKey]
      || DEFAULT_LAST_TIMES.subway.other[dayKey];
    const lastBusStr = DEFAULT_LAST_TIMES.bus.general[dayKey];

    const lastSubwayMin = parseTime(lastSubwayStr);
    const lastBusMin = parseTime(lastBusStr);

    // T맵으로 실제 소요시간 확인 (실패 시 근사)
    let transitDuration = await fetchTransitDuration(from, to);
    if (!transitDuration) {
      // 근사: 대중교통은 직선거리의 1.4배를 시속 25km로
      const R = 6371000;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(to.latitude - from.latitude);
      const dLng = toRad(to.longitude - from.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) *
        Math.sin(dLng / 2) ** 2;
      const distanceMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      transitDuration = Math.round((distanceMeters * 1.4) / 6.9); // 25km/h
    }

    // 필요한 출발 시각 (근무 종료 직후)
    const departMin = workEndMin + 15; // 근무 정리 15분 추가
    const durationMin = Math.ceil(transitDuration / 60);
    const arrivalMin = departMin + durationMin;

    // 막차 대비 시간 여유 (출발 시각 기준)
    const subwayMargin = lastSubwayMin - departMin;
    const busMargin = lastBusMin - departMin;

    // 위험도 판정
    let risk_level, can_return, warning_message;
    if (subwayMargin >= 60 || busMargin >= 60) {
      risk_level = "safe";
      can_return = true;
      warning_message = "막차까지 여유 있습니다.";
    } else if (subwayMargin >= 15 || busMargin >= 15) {
      risk_level = "tight";
      can_return = true;
      warning_message = `⚠️ 막차 시간 임박 — 근무 종료 후 바로 이동하세요`;
    } else if (subwayMargin > -30 || busMargin > -30) {
      risk_level = "danger";
      can_return = false;
      warning_message = `🚨 막차 놓칠 위험 — 심야버스나 택시가 필요합니다`;
    } else {
      risk_level = "impossible";
      can_return = false;
      warning_message = `🚨 막차 시간 지남 — 심야버스 또는 택시만 가능`;
    }

    // 대안 교통수단
    const alternatives = [];
    if (!can_return && region === "seoul") {
      const nightBuses = DEFAULT_LAST_TIMES.night_bus.seoul;
      nightBuses.slice(0, 3).forEach((nb) => {
        alternatives.push({
          type: "night_bus",
          label: `심야버스 ${nb.route}`,
          time: nb.time,
          area: nb.area,
        });
      });
    }

    // 택시 비용 (막차 놓쳤을 때 참고)
    if (!can_return) {
      // 하버사인으로 대략 계산
      const R = 6371000;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(to.latitude - from.latitude);
      const dLng = toRad(to.longitude - from.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) *
        Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      // 심야 할증 20% 적용
      let fare;
      if (distance < 2000) fare = 5760; // 4800 * 1.2
      else fare = Math.round((4800 + ((distance - 2000) / 100) * 100) * 1.2);

      alternatives.push({
        type: "taxi",
        label: "택시 (심야 할증 20%)",
        cost: fare,
      });
    }

    return NextResponse.json({
      ok: true,
      can_return,
      risk_level,
      work_end: workEndAt,
      estimated_depart: formatTime(departMin),
      estimated_arrival: formatTime(arrivalMin),
      duration_min: durationMin,
      last_subway_time: lastSubwayStr,
      last_bus_time: lastBusStr,
      warning_message,
      alternatives,
      region,
      weekend,
    });
  } catch (error) {
    console.error("[last-transit] error:", error);
    return NextResponse.json(
      { ok: false, error: "막차 시간 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
