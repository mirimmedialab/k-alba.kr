"use client";
import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/attribution";

/**
 * 첫 방문 유입경로(utm/referrer/ref/플랫폼)를 localStorage에 1회 저장.
 * 화면에는 아무것도 렌더하지 않음. 모든 페이지에 마운트되어 OAuth 리다이렉트 전에 값이 남도록 함.
 */
export default function AttributionTracker() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
