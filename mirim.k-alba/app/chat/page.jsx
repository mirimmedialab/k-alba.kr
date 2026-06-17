"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /chat — 인앱 채팅 기능 제거됨.
 * 실제 소통은 카카오톡 채널로 대체한다. 이 경로로 들어오면 홈으로 보낸다.
 * (네비/버튼 등 진입점은 모두 제거되어 정상 흐름에선 도달하지 않음)
 */
export default function ChatRemovedPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
