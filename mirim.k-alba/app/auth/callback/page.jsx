"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * /auth/callback
 *
 * OAuth (Google / Kakao) 인증 후 리다이렉트되는 페이지.
 *
 * 흐름:
 * 1. signup 또는 login 페이지에서 OAuth 버튼 클릭 직전 sessionStorage에 정보 저장
 *    - "k-alba-oauth-intent": "signup" | "login"
 *    - "k-alba-oauth-role"  : "worker" | "employer"  (signup 시에만)
 * 2. OAuth 완료 후 이 페이지로 진입
 * 3. 세션이 있으면:
 *    - signup 흐름: user_metadata.user_type 업데이트 + profiles 테이블 UPDATE
 *    - login 흐름:  user_metadata에서 user_type 읽기 (없으면 profiles에서 fallback)
 * 4. user_type에 따라 /my/jobs (employer) 또는 /jobs (worker)로 분기
 *
 * 에러 처리:
 * - URL에 error 파라미터(server_error 등) 있으면 메시지 표시 + 재시도 링크
 * - 세션 없으면 /login으로
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("processing"); // processing | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!supabase) {
      setStatus("error");
      setErrorMsg("Supabase 연결 오류. 잠시 후 다시 시도해주세요.");
      return;
    }

    // URL 해시/쿼리에 error가 있으면 즉시 에러 처리
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const combined = hash + search;
      if (combined.includes("error=")) {
        // error_description 추출
        const m = combined.match(/error_description=([^&]+)/);
        const desc = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "OAuth 인증에 실패했습니다";
        setStatus("error");
        setErrorMsg(desc);
        return;
      }
    }

    // 세션 확보 + user_type 처리
    (async () => {
      try {
        // OAuth 직후엔 onAuthStateChange가 더 안정적일 수 있어, 1차 시도 후 짧게 재시도
        let session = null;
        for (let i = 0; i < 8; i++) {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }

        if (!session?.user) {
          setStatus("error");
          setErrorMsg("로그인 세션을 확인할 수 없습니다. 다시 시도해주세요.");
          return;
        }

        const user = session.user;
        const intent = sessionStorage.getItem("k-alba-oauth-intent") || "login";
        const intendedRole = sessionStorage.getItem("k-alba-oauth-role"); // worker | employer | null

        let userType = user.user_metadata?.user_type;

        if (intent === "signup" && intendedRole && (intendedRole === "worker" || intendedRole === "employer")) {
          // 신규 가입: user_metadata + profiles 둘 다 업데이트
          if (userType !== intendedRole) {
            await supabase.auth.updateUser({
              data: { user_type: intendedRole },
            });
            userType = intendedRole;
          }

          // profiles 테이블 동기화 (handle_new_user trigger가 'worker' 기본값으로 만들어놨을 것)
          // 이메일이 누락된 경우 보강 + user_type 강제 업데이트
          const { error: upErr } = await supabase
            .from("profiles")
            .update({
              user_type: intendedRole,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
            })
            .eq("id", user.id);

          if (upErr) {
            // UPDATE 실패 (행 없음) → INSERT 시도
            await supabase.from("profiles").upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split("@")[0],
              user_type: intendedRole,
            });
          }
        } else {
          // 로그인: user_type이 metadata에 없으면 profiles에서 가져옴
          if (!userType) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("user_type")
              .eq("id", user.id)
              .maybeSingle();
            userType = prof?.user_type || "worker";
          }
        }

        // 정리
        sessionStorage.removeItem("k-alba-oauth-intent");
        sessionStorage.removeItem("k-alba-oauth-role");

        // 분기 라우팅
        const dest = userType === "employer" ? "/my/jobs" : "/jobs";
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
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1F3D", marginBottom: 12 }}>
          로그인을 완료할 수 없어요
        </h1>
        <p style={{ fontSize: 14, color: "#4A4640", lineHeight: 1.7, maxWidth: 420, marginBottom: 24 }}>
          {errorMsg}
        </p>
        <p style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.6, maxWidth: 380, marginBottom: 24 }}>
          이전에 가입을 시도하다가 중단된 적이 있다면, 같은 이메일로 다시 가입할 때 일시적으로 차단될 수 있어요. 잠시 후 다시 시도하거나 다른 로그인 방법을 사용해주세요.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/login")}
            style={{
              padding: "10px 20px",
              background: "#FF6B5A",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            로그인 다시 시도
          </button>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "10px 20px",
              background: "#fff",
              color: "#1A1F3D",
              border: "1px solid #EDEAE6",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid #EDEAE6",
          borderTopColor: "#FF6B5A",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          marginBottom: 20,
        }}
      />
      <p style={{ fontSize: 14, color: "#4A4640" }}>로그인 처리 중...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
