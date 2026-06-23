"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * /auth/callback
 *
 * OAuth(Google/Kakao) 인증 후 리다이렉트되는 페이지.
 *
 * 1) 일반 로그인/가입: sessionStorage의 intent/role 기반 처리 + user_type 분기
 * 2) 카카오 챗봇 공고등록 연결: URL 쿼리 kakaojoin=<botUserKey> 가 있으면,
 *    인증된 사용자 토큰으로 서버 API(/api/employer/link-kakao)를 호출해 안전하게 연결한 뒤
 *    /employer/kakao-join/done 으로 이동한다. (sessionStorage 의존 X, 인증 우회 X)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("processing");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase) {
      setStatus("error");
      setErrorMsg("Supabase 연결 오류. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (typeof window !== "undefined") {
      const combined = (window.location.hash || "") + (window.location.search || "");
      if (combined.includes("error=")) {
        const m = combined.match(/error_description=([^&]+)/);
        const desc = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "OAuth 인증에 실패했습니다";
        setStatus("error");
        setErrorMsg(desc);
        return;
      }
    }

    (async () => {
      try {
        let session = null;
        for (let i = 0; i < 8; i++) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) { session = data.session; break; }
          await new Promise((r) => setTimeout(r, 250));
        }
        if (!session?.user) {
          setStatus("error");
          setErrorMsg("로그인 세션을 확인할 수 없습니다. 다시 시도해주세요.");
          return;
        }

        const user = session.user;

        // 탈퇴(비활성화)된 계정이면 차단하고 로그인으로 (없는 계정 안내)
        try {
          const { data: prof } = await supabase
            .from("profiles").select("deactivated_at").eq("id", user.id).maybeSingle();
          if (prof?.deactivated_at) {
            await supabase.auth.signOut();
            router.replace("/login?reason=deactivated");
            return;
          }
        } catch (_) {}

        let kakaoBotKey = "";
        try { kakaoBotKey = localStorage.getItem("kalba_bot_key") || ""; } catch (_) {}
        if (!kakaoBotKey) {
          kakaoBotKey = new URLSearchParams(window.location.search).get("kakaojoin") || "";
        }

        // ── 카카오 챗봇 공고등록 연결 흐름 ──
        if (kakaoBotKey) {
          let ok = false;
          let detail = "";
          try {
            const res = await fetch("/api/employer/link-kakao", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ botUserKey: kakaoBotKey }),
            });
            ok = res.ok;
            if (!ok) { try { detail = (await res.json())?.error || ""; } catch (_) {} }
          } catch (_) {}
          try { localStorage.removeItem("kalba_bot_key"); } catch (_) {}
          if (!ok) {
            setStatus("error");
            setErrorMsg("연결 처리에 실패했어요. 잠시 후 다시 시도해주세요." + (detail ? ` (${detail})` : ""));
            return;
          }
          router.replace("/employer/kakao-join/done");
          return;
        }

        // ── 일반 로그인/가입 흐름 ──
        const intent = sessionStorage.getItem("k-alba-oauth-intent") || "login";
        const intendedRole = sessionStorage.getItem("k-alba-oauth-role");
        let userType = user.user_metadata?.user_type;

        if (intent === "signup" && (intendedRole === "worker" || intendedRole === "employer")) {
          if (userType !== intendedRole) {
            await supabase.auth.updateUser({ data: { user_type: intendedRole } });
            userType = intendedRole;
          }
          const { error: upErr } = await supabase
            .from("profiles")
            .update({
              user_type: intendedRole,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
            })
            .eq("id", user.id);
          if (upErr) {
            await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
              user_type: intendedRole,
            });
          }
        } else if (!userType) {
          const { data: prof } = await supabase
            .from("profiles").select("user_type").eq("id", user.id).maybeSingle();
          userType = prof?.user_type || "worker";
        }

        sessionStorage.removeItem("k-alba-oauth-intent");
        sessionStorage.removeItem("k-alba-oauth-role");

        // 로그인 시작 시 지정한 이동 경로(예: 관리자 콘솔)가 있으면 우선 적용
        let postLogin = "";
        try { postLogin = sessionStorage.getItem("k-alba-post-login") || ""; } catch (_) {}
        sessionStorage.removeItem("k-alba-post-login");
        if (postLogin && postLogin.startsWith("/")) {
          router.replace(postLogin);
          return;
        }

        // 약관 동의 게이트(OAuth 가입자): 동의 기록이 없으면 동의 페이지로 보냄
        const dest = userType === "employer" ? "/my/jobs" : "/jobs";
        const { data: consentProf } = await supabase
          .from("profiles").select("agreed_terms_at, agreed_privacy_at").eq("id", user.id).maybeSingle();
        if (!consentProf?.agreed_terms_at || !consentProf?.agreed_privacy_at) {
          router.replace(`/consent?next=${encodeURIComponent(dest)}`);
          return;
        }
        router.replace(dest);
      } catch (e) {
        console.error("[auth/callback]", e);
        setStatus("error");
        setErrorMsg(e?.message || "예상치 못한 오류가 발생했습니다.");
      }
    })();
  }, [router]);

  if (status === "error") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1F3D", marginBottom: 12 }}>로그인을 완료할 수 없어요</h1>
        <p style={{ fontSize: 14, color: "#4A4640", lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>{errorMsg}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/login")} style={{ padding: "10px 20px", background: "#FF6B5A", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>다시 시도</button>
          <button onClick={() => router.push("/")} style={{ padding: "10px 20px", background: "#fff", color: "#1A1F3D", border: "1px solid #EDEAE6", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>홈으로</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #EDEAE6", borderTopColor: "#FF6B5A", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 20 }} />
      <p style={{ fontSize: 14, color: "#4A4640" }}>로그인 처리 중...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
