"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * /employer/kakao-join?b=<botUserKey>
 *
 * 카카오톡 챗봇에서 '공고 등록'을 누른 사장님 간편가입 랜딩.
 * - 보안: 항상 실제 카카오 로그인(OAuth)을 거친다. (세션이 있어도 생략하지 않음)
 * - botUserKey(b)는 localStorage(kalba_bot_key)에 저장해 전달한다.
 *   (redirectTo 쿼리는 Supabase 허용목록에서 잘릴 수 있어 사용하지 않음. 같은 도메인이라
 *    OAuth 왕복 후에도 localStorage 값은 유지된다.)
 * - 로그인 완료 후 /auth/callback 에서 서버 API(/api/employer/link-kakao)로 연결한다.
 */
function JoinInner() {
  const sp = useSearchParams();
  const b = sp.get("b") || "";
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!b || !supabase) return;
    setBusy(true);
    const origin = window.location.origin;
    try { localStorage.setItem("kalba_bot_key", b); } catch (_) {}
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (error) setBusy(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 40px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: "28px 22px", boxShadow: "0 6px 24px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "#1D4ED8" }}>K-ALBA 사장님</div>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#16243F", margin: "10px 0 6px", lineHeight: 1.35 }}>
          카카오로 로그인하고<br />공고를 등록해요
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 20px" }}>
          카카오 계정으로 안전하게 인증한 뒤<br />챗봇에서 바로 공고를 등록하세요.
        </p>

        <div style={{ textAlign: "left", background: "#F1F5F9", borderRadius: 12, padding: "13px 16px", marginBottom: 20, fontSize: 13.5, color: "#334155", lineHeight: 1.9 }}>
          <div>✅ 카카오로 30초 간편 가입</div>
          <div>✅ 챗봇에서 단계별로 공고 등록</div>
          <div>✅ 등록한 공고 한눈에 관리</div>
        </div>

        <button
          onClick={start}
          disabled={busy || !b}
          style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: (busy || !b) ? "#FDE68A" : "#FEE500", color: "#191600", fontSize: 16, fontWeight: 800, cursor: (busy || !b) ? "default" : "pointer" }}
        >
          {busy ? "카카오 로그인 중…" : "카카오로 로그인하기"}
        </button>

        {!b && (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 14, lineHeight: 1.6 }}>
            이 화면은 카카오톡 챗봇에서 '공고 등록'을 누르면 자동으로 열려요.
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
