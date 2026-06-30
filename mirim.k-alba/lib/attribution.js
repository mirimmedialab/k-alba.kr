/**
 * 가입 유입경로(acquisition) 추적
 *
 * 동작
 *  1) captureFirstTouch(): 첫 방문 시 URL의 utm_*, ref, document.referrer, 도착경로, 앱/웹을
 *     localStorage 에 "최초값(first-touch)"으로 저장한다. 이미 값이 있으면 덮어쓰지 않는다.
 *     (모든 페이지 mount 에서 호출 → OAuth 리다이렉트 전에 이미 저장돼 있게 함)
 *  2) getAttributionForSignup(): 가입 시점에 저장값을 읽어 채널로 분류해 profiles 에 넣을 객체를 반환.
 *
 * 채널 태깅 팁: 우리가 뿌리는 링크엔 ?utm_source= 를 꼭 붙일 것
 *   카톡 채널 → ?utm_source=kakao_channel / 인스타 → ?utm_source=instagram / 학교 → ?ref=school_OO
 */

const KEY = "kalba_attribution";

function isApp() {
  try {
    return !!(typeof window !== "undefined" && window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  } catch (_) {
    return false;
  }
}

export function captureFirstTouch() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY)) return; // 최초 1회만
    const sp = new URLSearchParams(window.location.search || "");
    const data = {
      utm_source: sp.get("utm_source") || "",
      utm_medium: sp.get("utm_medium") || "",
      utm_campaign: sp.get("utm_campaign") || "",
      ref_code: sp.get("ref") || sp.get("ref_code") || "",
      referrer: (document.referrer || "").slice(0, 300),
      landing_path: (window.location.pathname + window.location.search).slice(0, 300),
      platform: isApp() ? "app" : "web",
      ts: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (_) {}
}

/** 저장된 첫방문 값(원본) */
export function readFirstTouch() {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/** 첫방문 값 → 채널 분류 */
export function classifyChannel(a = {}) {
  const src = (a.utm_source || "").toLowerCase();
  const ref = (a.referrer || "").toLowerCase();

  if (a.ref_code) {
    return /^school/i.test(a.ref_code) ? "school" : "referral";
  }
  if (src) {
    if (src.includes("kakao")) return "kakao_channel";
    if (src.includes("naver")) return "naver";
    if (src.includes("google")) return "google";
    if (/(instagram|^ig$|facebook|^fb$|meta)/.test(src)) return "sns";
    return src; // 커스텀 utm_source 는 그대로 보존
  }
  if (ref) {
    if (ref.includes("k-alba.kr")) return isApp() ? "app" : "direct"; // 내부 이동
    if (ref.includes("kakao")) return "kakao_channel";
    if (ref.includes("naver")) return "naver";
    if (ref.includes("google")) return "google";
    if (ref.includes("instagram") || ref.includes("facebook")) return "sns";
    return "etc"; // 그 외 외부 사이트
  }
  if (a.platform === "app" || isApp()) return "app";
  return "direct";
}

/** 가입 시 profiles 에 기록할 컬럼 객체 (값 없으면 null) */
export function getAttributionForSignup() {
  if (typeof window === "undefined") return {};
  const a = readFirstTouch();
  return {
    signup_channel: classifyChannel(a),
    utm_source: a.utm_source || null,
    utm_medium: a.utm_medium || null,
    utm_campaign: a.utm_campaign || null,
    signup_referrer: a.referrer || null,
    landing_path: a.landing_path || null,
    signup_platform: a.platform || (isApp() ? "app" : "web"),
    ref_code: a.ref_code || null,
  };
}

/** 채널 코드 → 한글 라벨 (관리자 화면용) */
export const CHANNEL_LABELS = {
  kakao_channel: "카카오톡 채널/챗봇",
  naver: "네이버",
  google: "구글",
  sns: "SNS(인스타·페북)",
  referral: "지인추천",
  school: "학교",
  app: "앱(직접)",
  direct: "직접유입",
  etc: "기타 외부",
};
export function channelLabel(code) {
  if (!code) return "기존(추적 전)";
  return CHANNEL_LABELS[code] || code;
}
