"use client";
import { useEffect, useState } from "react";

/**
 * useIsDesktop
 *
 * window.innerWidth >= breakpoint(기본 1024) 이면 true.
 * SSR/hydration 안전: 마운트 전에는 항상 false 를 반환해
 * 서버 렌더(모바일 가정)와 첫 클라이언트 렌더가 일치하도록 한다.
 * 마운트 후 실제 폭을 검사하고 resize 에 반응한다.
 */
export function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isDesktop;
}

export default useIsDesktop;
