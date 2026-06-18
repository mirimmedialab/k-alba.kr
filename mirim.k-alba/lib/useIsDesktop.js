"use client";
import { useSyncExternalStore } from "react";

/**
 * useIsDesktop
 *
 * window.innerWidth >= breakpoint(기본 1024) 이면 true.
 *
 * useSyncExternalStore 사용 이유:
 *   - 기존 useState+useEffect 방식은 "최초 렌더 = 항상 모바일(false)" → 마운트 후 데스크탑(true)로
 *     바뀌면서, 클라이언트 페이지 이동마다 모바일→데스크탑 깜빡임이 보였다.
 *   - useSyncExternalStore는 클라이언트에서 마운트되는 순간(SPA 이동) getSnapshot으로 실제 폭을
 *     즉시 읽어 첫 렌더부터 올바른 값을 준다 → 이동 시 깜빡임 없음.
 *   - 서버 렌더(SSR)에서는 getServerSnapshot이 false(모바일 가정)를 반환해 hydration mismatch 방지.
 *     (최초 새로고침/딥링크 1회는 SSR 특성상 잠깐 보정될 수 있으나, 일반적인 화면 이동에선 깜빡임 없음.)
 */
function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export function useIsDesktop(breakpoint = 1024) {
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.innerWidth >= breakpoint : false),
    () => false
  );
}

export default useIsDesktop;
