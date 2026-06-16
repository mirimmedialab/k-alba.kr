"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, signInWithOAuth } from "@/lib/supabase";

/**
 * /employer/kakao-join?b=<botUserKey>
 *
 * 카카오톡 챗봇에서 '공고 등록'을 누른 사장님을 위한 간편가입/연결 랜딩.
 * - 이미 로그인돼 있으면: OAuth 없이 현재 계정에 botUserKey만 연결 → 완료 페이지
 * - 로그인 안 돼 있으면: '카카오로 시작하기' → 카카오 로그인(intent=signup, role=employer)
 *   → /auth/callback 에서 botUserKey ↔ 회원 매핑 후 완료 페이지로 이동
 */
function JoinInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const b = sp.get("b") || "";
  const [phase, setPhase] = useState("checking"); // checking | ready
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (b) { try { sessionStorage.setItem("k-alba-kakao-botkey", b); } catch (_) {} }
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user && b) {
          // 이미 로그인됨 → 현재 계정에 바로 연결 (OAuth 불필요)
          await supabase
            .from("profiles")
            .update({ kakao_bot_user_key: b, user_type: "employer" })
            .eq("id", data.session.user.id);
          try {
            sessionStorage.removeItem("k-alba-kakao-botkey");
            sessionStorage.removeItem("k-alba-oauth-intent");
            sessionStorage.removeItem("k-alba-oauth-role");
          } catch (_) {}
          router.replace("/employer/kakao-join/done");
          return;
        }
      } catch (_) {}
      setPhase("ready");
    })();
  }, [b, router]);

  const start = async () => {
    setBusy(true);
    try {
      sessionStorage.setItem("k-alba-oauth-intent", "signup");
      sessionStorage.setItem("k-alba-oauth-role", "employer");
      if (b) sessionStorage.setItem("k-alba-kakao-botkey", b);
    } catch (_) {}
    await signInWithOAuth("kakao");
  };

  if (phase === "checking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px 20px" }}>
        <div style={{ width: 30, height: 30, border: "3px solid #E5E7EB", borderTopColor: "#1D4ED8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px 40px" }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: "28px 22px", boxShadow: "0 6px 24px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em", color: "#1D4ED8" }}>K-ALBA 사장님</div>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: "#16243F", margin: "10px 0 6px", lineHeight: 1.35 }}>
          30초 카카오 가입 후<br />공고를 등록해요
        </h1>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 20px" }}>
          카카오로 간편하게 가입하고<br />챗봇에서 바로 공고를 등록하세요.
        </p>

        <div style={{ textAlign: "left", background: "#F1F5F9", borderRadius: 12, padding: "13px 16px", marginBottom: 20, fontSize: 13.5, color: "#334155", lineHeight: 1.9 }}>
          <div>✅ 카카오로 30초 간편 가입</div>
          <div>✅ 챗봇에서 단계별로 공고 등록</div>
          <div>✅ 등록한 공고 한눈에 관리</div>
        </div>

        <button
          onClick={start}
          disabled={busy}
          style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", background: busy ? "#FDE68A" : "#FEE500", color: "#191600", fontSize: 16, fontWeight: 800, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "카카오로 이동 중…" : "카카오로 시작하기"}
        </button>

        {!b && (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 14, lineHeight: 1.6 }}>
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
