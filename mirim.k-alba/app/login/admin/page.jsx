"use client";
import { useState } from "react";
import { signInWithOAuth } from "@/lib/supabase";

/**
 * /login/admin — 관리자 전용 로그인 (다크 미니멀)
 *
 * - 네비/프레임/푸터/카카오버튼 없이 풀스크린 중앙 정렬 (AppFrame 제외 목록)
 * - 소셜 로그인(카카오/구글)만 노출. 로그인 후 /admin 으로 이동(콜백 처리).
 */
export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSocial = async (provider) => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("k-alba-oauth-intent", "login");
      sessionStorage.removeItem("k-alba-oauth-role");
      sessionStorage.setItem("k-alba-post-login", "/admin");
    }
    setLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="adlg-root">
      <div className="adlg-card">
        <img
          className="adlg-logo"
          src="/img/k-alba_logo.svg"
          alt="K-ALBA"
        />
        <div className="adlg-cap">ADMIN CONSOLE</div>

        {error && <div className="adlg-err">{error}</div>}

        <button
          type="button"
          className="adlg-btn adlg-kakao"
          onClick={() => handleSocial("kakao")}
          disabled={loading}
        >
          <svg width="19" height="19" viewBox="0 0 256 256" aria-hidden="true">
            <path
              fill="#191600"
              d="M128 36C70.56 36 24 72.71 24 118c0 29.28 19.47 54.97 48.75 69.48-1.6 5.5-10.24 35.34-10.58 37.69 0 0-.21 1.76.93 2.43 1.14.68 2.48.15 2.48.15 3.27-.46 37.94-24.81 43.93-29.04 5.85.83 11.86 1.29 18.49 1.29 57.44 0 104-36.71 104-82s-46.56-82-104-82Z"
            />
          </svg>
          <span>카카오톡으로 로그인</span>
        </button>

        <button
          type="button"
          className="adlg-btn adlg-google"
          onClick={() => handleSocial("google")}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          <span>Google로 로그인</span>
        </button>
      </div>

      <style>{`
        .adlg-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0A1628;
          padding: 24px;
        }
        .adlg-card {
          width: 100%;
          max-width: 360px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 40px 32px 34px;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        }
        .adlg-logo {
          height: 42px;
          width: auto;
          display: block;
          margin: 0 auto 14px;
          filter: brightness(0) invert(1);
        }
        .adlg-cap {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: #6B7A95;
          margin-bottom: 30px;
        }
        .adlg-err {
          padding: 10px 12px;
          background: rgba(220,38,38,0.14);
          color: #FCA5A5;
          border: 1px solid rgba(220,38,38,0.4);
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .adlg-btn {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          font-size: 14.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          cursor: pointer;
          transition: transform 0.06s ease, filter 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }
        .adlg-btn:disabled { opacity: 0.6; cursor: default; }
        .adlg-btn:not(:disabled):hover { filter: brightness(0.97); box-shadow: 0 6px 18px rgba(0,0,0,0.25); }
        .adlg-btn:not(:disabled):active { transform: translateY(1px); }
        .adlg-kakao {
          background: #FEE500;
          color: #191600;
          border: none;
          margin-bottom: 12px;
        }
        .adlg-google {
          background: #FFFFFF;
          color: #1F2937;
          border: 1px solid #E5E7EB;
        }
      `}</style>
    </div>
  );
}
