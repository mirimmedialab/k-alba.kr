"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithOAuth } from "@/lib/supabase";

/**
 * /employer/kakao-join?b=<botUserKey>
 *
 * 카카오톡 챗봇에서 '공고 등록'을 누른 미가입 사장님을 위한 간편가입 랜딩.
 * - URL의 b(botUserKey)를 sessionStorage에 저장
 * - '카카오로 시작하기' → 카카오 OAuth (intent=signup, role=employer)
 * - /auth/callback 에서 botUserKey ↔ 회원 매핑 후 /employer/kakao-join/done 로 이동
 */
function JoinInner() {
  const sp = useSearchParams();
  const b = sp.get("b") || "";
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (b) { try { sessionStorage.setItem("k-alba-kakao-botkey", b); } catch (_) {} }
  }, [b]);

  const start = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("k-alba-oauth-intent", "signup");
      sessionStorage.setItem("k-alba-oauth-role", "employer");
      if (b) sessionStorage.setItem("k-alba-kakao-botkey", b);
    } catch (_) {}
    await signInWithOAuth("kakao");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "#F8FAFC" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: "32px 24px", boxShadow: "0 6px 24px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "#1D4ED8" }}>K-ALBA 사장님</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#16243F", margin: "10px 0 6px", lineHeight: 1.35 }}>
          30초 카카오 가입 후<br />공고를 등록해요
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 22px" }}>
          가입하면 올린 공고에<br />지원이 들어올 때마다 <b>이메일로 알림</b>을 받아요.
        </p>

        <div style={{ textAlign: "left", background: "#F1F5F9", borderRadius: 12, padding: "14px 16px", marginBottom: 22, fontSize: 13.5, color: "#334155", lineHeight: 1.9 }}>
          <div>✅ 외국인 7개국 자동 매칭</div>
          <div>✅ 비자 자동 검증으로 합법 채용</div>
          <div>✅ 지원 현황 이메일 알림</div>
        </div>

        <button
          onClick={start}
          disabled={busy}
          style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: busy ? "#FDE68A" : "#FEE500", color: "#191600", fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </button>

        {!b && (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 16, lineHeight: 1.6 }}>
            이 화면은 카카오톡 챗봇에서 ‘공고 등록’을 누르면 자동으로 열려요.
          </p>
        )}
      </div>
    </div>
  );
}

export default function KakaoJoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinInner />
    </Suspense>
  );
}
