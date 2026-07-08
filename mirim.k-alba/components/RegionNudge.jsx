"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getProfile } from "@/lib/supabase";
import { T } from "@/lib/theme";

// 관심 지역 미설정 알바생에게 로그인 후 지역 설정을 유도하는 배너.
// 지역을 설정하면 이메일 알림이 해당 시/도 공고만 오게 됨(미설정 시 전체 발송).
const HIDE_ON = ["/profile", "/consent", "/login", "/signup", "/auth"];

export default function RegionNudge() {
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
        const hasRegions = Array.isArray(p.regions) && p.regions.filter(Boolean).length > 0;
        if (isWorker && !hasRegions) setShow(true);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show || dismissed) return null;
  if (HIDE_ON.some((h) => (pathname || "").startsWith(h))) return null;

  return (
    <div style={{ background: T.coralL, borderBottom: `1px solid ${T.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}>
      <div style={{ flex: 1, fontSize: 13, color: T.navy, lineHeight: 1.5 }}>
        <strong style={{ fontWeight: 700 }}>관심 지역</strong>을 설정하면 내 지역 알바 알림만 받아요.
      </div>
      <Link href="/profile" style={{ flexShrink: 0, background: T.coral, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 700, padding: "7px 12px", borderRadius: 8 }}>설정하기</Link>
      <button aria-label="닫기" onClick={() => setDismissed(true)} style={{ flexShrink: 0, background: "none", border: "none", color: T.ink3, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
}
