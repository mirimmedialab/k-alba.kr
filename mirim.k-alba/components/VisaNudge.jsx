"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getProfile } from "@/lib/supabase";
import { T } from "@/lib/theme";

// 비자 미등록 알바생에게 로그인 후 비자 등록을 유도하는 배너.
// 비자를 등록하면 비자별 취업 가능 알바 안내 + (유학생) 시간제취업 확인서 자동 생성이 가능해진다.
const HIDE_ON = ["/profile", "/consent", "/login", "/signup", "/auth"];

export default function VisaNudge() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u || cancelled) return;
        const p = await getProfile(u.id);
        if (cancelled || !p) return;
        const isWorker = (p.user_type || "worker") !== "employer";
        if (isWorker && !p.visa) setShow(true);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show || dismissed) return null;
  if (HIDE_ON.some((h) => (pathname || "").startsWith(h))) return null;

  return (
    <div style={{ background: T.mintL, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
      <div style={{ flex: 1, fontSize: 13, color: T.navy, lineHeight: 1.5 }}>
        <strong style={{ fontWeight: 700 }}>비자 정보</strong>를 입력하면 비자별로 취업 가능한 알바 정보를 알려드리고,
        유학생은 <strong style={{ fontWeight: 700 }}>시간제취업 확인서</strong>도 자동으로 만들어 드려요.
      </div>
      <Link href="/profile" style={{ flexShrink: 0, background: T.coral, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8 }}>등록하기</Link>
      <button aria-label="닫기" onClick={() => setDismissed(true)} style={{ flexShrink: 0, background: "none", border: "none", color: T.ink3, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
}
