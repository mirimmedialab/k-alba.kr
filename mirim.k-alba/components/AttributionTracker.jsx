"use client";
import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/attribution";

/**
 * 첫 방문 유입경로(utm/referrer/ref/플랫폼)를 localStorage에 1회 저장.
 * 기록 직후 주소창의 utm_*·ref 파라미터는 제거해 사용자에겐 깔끔한 URL만 보이게 함(새로고침 없음).
 * 화면에는 아무것도 렌더하지 않음. 모든 페이지에 마운트되어 OAuth 리다이렉트 전에 값이 남도록 함.
 */
const TRACK_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "ref_code"];

export default function AttributionTracker() {
  useEffect(() => {
    captureFirstTouch();
    try {
      const url = new URL(window.location.href);
      let dirty = false;
      for (const key of TRACK_PARAMS) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          dirty = true;
        }
      }
      if (dirty) {
        const qs = url.searchParams.toString();
        window.history.replaceState(null, "", url.pathname + (qs ? "?" + qs : "") + url.hash);
      }
    } catch (_) {}
  }, []);
  return null;
}
