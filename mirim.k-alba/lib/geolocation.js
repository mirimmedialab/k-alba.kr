"use client";

/**
 * K-ALBA 위치 유틸리티
 *
 * 웹과 네이티브 앱 양쪽에서 동일하게 동작.
 * - 네이티브 앱: Capacitor Geolocation 플러그인 사용 (정확도 높음, 권한 시스템)
 * - 웹: navigator.geolocation 사용 (fallback)
 *
 * 사용 예시:
 *   import { getCurrentLocation, checkLocationPermission } from "@/lib/geolocation";
 *
 *   const { status } = await checkLocationPermission();
 *   if (status === "granted") {
 *     const { latitude, longitude } = await getCurrentLocation();
 *   }
 */

// Capacitor가 설치된 환경인지 동적으로 확인
// (웹 빌드 시에는 Capacitor 패키지가 없어도 에러 안 나도록)
let Capacitor = null;
let Geolocation = null;

if (typeof window !== "undefined") {
  try {
    // 동적 require (번들러에 따라 다르게 처리)
    Capacitor = (window).Capacitor || null;
  } catch {
    Capacitor = null;
  }
}

async function loadCapacitorModules() {
  if (Geolocation) return Geolocation;
  if (!isNativePlatform()) return null;

  try {
    // 네이티브 앱 환경에서만 동적 import
    const mod = await import("@capacitor/geolocation");
    Geolocation = mod.Geolocation;
    return Geolocation;
  } catch {
    return null;
  }
}

/**
 * 네이티브 앱에서 실행 중인지 확인
 * (Capacitor.isNativePlatform()의 래퍼)
 */
export function isNativePlatform() {
  if (typeof window === "undefined") return false;
  const cap = (window).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * 현재 플랫폼 반환: "ios" | "android" | "web"
 */
export function getPlatform() {
  if (typeof window === "undefined") return "web";
  const cap = (window).Capacitor;
  return cap?.getPlatform?.() || "web";
}

/**
 * 위치 정보 타입
 */


/**
 * 위치 권한 확인
 *
 * - 네이티브: Capacitor.Geolocation.checkPermissions()
 * - 웹: navigator.permissions.query (일부 브라우저만 지원)
 *
 * @returns 현재 권한 상태
 */
export async function checkLocationPermission() {
  // 네이티브 앱
  if (isNativePlatform()) {
    const geo = await loadCapacitorModules();
    if (!geo) return { status: "unavailable" };

    try {
      const perm = await geo.checkPermissions();
      // Capacitor는 "granted" | "denied" | "prompt" | "prompt-with-rationale"
      const status = perm.location === "granted" ? "granted"
                   : perm.location === "denied" ? "denied"
                   : "prompt";
      return { status };
    } catch {
      return { status: "unavailable" };
    }
  }

  // 웹
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { status: "unavailable" };
  }

  // Permissions API 지원 브라우저
  if ("permissions" in navigator) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return { status: result.state };
    } catch {
      // 쿼리 실패 시 prompt로 간주
      return { status: "prompt" };
    }
  }

  return { status: "prompt" };
}

/**
 * 위치 권한 요청 (네이티브 전용 — 웹은 getCurrentLocation 호출 시 자동 요청)
 */
export async function requestLocationPermission() {
  if (isNativePlatform()) {
    const geo = await loadCapacitorModules();
    if (!geo) return { status: "unavailable" };

    try {
      const result = await geo.requestPermissions();
      const status = result.location === "granted" ? "granted"
                   : result.location === "denied" ? "denied"
                   : "prompt";
      return { status };
    } catch {
      return { status: "unavailable" };
    }
  }

  // 웹은 권한 요청을 별도로 하지 않고, getCurrentLocation 호출 시 자동 프롬프트
  return { status: "prompt" };
}

/**
 * 현재 위치 좌표 가져오기
 *
 * @param options 위치 정확도, 타임아웃 옵션
 * @returns 위치 정보
 * @throws Error ("PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT" | "NOT_SUPPORTED")
 */
export async function getCurrentLocation(options) {
  const highAccuracy = options?.highAccuracy ?? true;
  const timeoutMs = options?.timeoutMs ?? 10000;

  // 네이티브 앱
  if (isNativePlatform()) {
    const geo = await loadCapacitorModules();
    if (!geo) throw new Error("NOT_SUPPORTED");

    try {
      // 권한 먼저 체크
      const permCheck = await geo.checkPermissions();
      if (permCheck.location !== "granted") {
        const req = await geo.requestPermissions();
        if (req.location !== "granted") {
          throw new Error("PERMISSION_DENIED");
        }
      }

      const pos = await geo.getCurrentPosition({
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
      });

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      };
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("denied") || msg.includes("DENIED")) throw new Error("PERMISSION_DENIED");
      if (msg.includes("timeout") || msg.includes("TIMEOUT")) throw new Error("TIMEOUT");
      throw new Error("POSITION_UNAVAILABLE");
    }
  }

  // 웹
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("NOT_SUPPORTED");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp,
      }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED: reject(new Error("PERMISSION_DENIED")); break;
          case err.POSITION_UNAVAILABLE: reject(new Error("POSITION_UNAVAILABLE")); break;
          case err.TIMEOUT: reject(new Error("TIMEOUT")); break;
          default: reject(new Error("UNKNOWN"));
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 60000, // 1분 캐시
      }
    );
  });
}

/**
 * 두 좌표 간 거리 (하버사인 공식, 단위: 미터)
 * 간단한 거리 계산용. 실제 경로 거리는 Kakao Mobility API 사용.
 */
export function calculateDistanceMeters(
  lat1, lng1,
  lat2, lng2
) {
  const R = 6371000; // 지구 반지름 (미터)
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 거리를 사용자 친화적 문자열로 포맷
 * 외국인을 위해 직관적인 표현 사용
 *
 * 900 → "900m" (1km 미만은 미터)
 * 1200 → "1.2km"
 * 12500 → "12km" (10km 이상은 정수)
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

/**
 * 도보 예상 시간 (보행 속도 평균 4km/h 기준, 대략적)
 * 실제 정확한 값은 Kakao/T맵 경로 API 사용
 */
export function estimateWalkingMinutes(meters) {
  const walkingSpeedMps = 1.1; // 초당 1.1미터 (약 4km/h)
  return Math.round(meters / walkingSpeedMps / 60);
}

/**
 * 에러 코드를 사용자 친화적 메시지로 변환 (i18n 연동 가능)
 */
export function getLocationErrorMessage(errorCode, lang = "ko") {
  const messages = {
    ko: {
      PERMISSION_DENIED: "위치 권한이 필요해요. 설정에서 허용해 주세요.",
      POSITION_UNAVAILABLE: "위치를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.",
      TIMEOUT: "위치 확인에 시간이 너무 오래 걸려요. 다시 시도해 주세요.",
      NOT_SUPPORTED: "이 기기에서는 위치 서비스를 지원하지 않아요.",
      UNKNOWN: "위치를 가져오는 중 문제가 발생했어요.",
    },
    en: {
      PERMISSION_DENIED: "Location permission needed. Please allow in settings.",
      POSITION_UNAVAILABLE: "Cannot find your location. Please try again.",
      TIMEOUT: "Location is taking too long. Please try again.",
      NOT_SUPPORTED: "Location service is not supported on this device.",
      UNKNOWN: "An error occurred while getting your location.",
    },
  };
  return messages[lang]?.[errorCode] || messages.ko[errorCode] || messages.ko.UNKNOWN;
}
