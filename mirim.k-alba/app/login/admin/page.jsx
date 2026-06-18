"use client";
import { useState } from "react";

/**
 * /login/admin — 관리자 전용 로그인 (ID/비밀번호)
 *
 * - 네비/프레임/푸터/카카오버튼 없이 풀스크린 중앙 정렬 (AppFrame 제외 목록)
 * - /api/admin/auth/login 으로 자격증명 확인 → httpOnly 쿠키 발급 → /admin 이동
 */
export default function AdminLoginPage() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }
      // 쿠키 적용을 위해 전체 내비게이션으로 이동
      window.location.href = "/admin";
    } catch (_) {
      setError("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="adlg-root">
      <form className="adlg-card" onSubmit={submit}>
        <img className="adlg-logo" src="/img/k-alba_logo.svg" alt="K-ALBA" />
        <div className="adlg-cap">ADMIN CONSOLE</div>

        {error && <div className="adlg-err">{error}</div>}

        <input
          className="adlg-input"
          type="text"
          placeholder="아이디"
          value={id}
          onChange={(e) => setId(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <input
          className="adlg-input"
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
        />

        <button type="submit" className="adlg-btn" disabled={loading || !id || !pw}>
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>

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
        .adlg-input {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          margin-bottom: 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-size: 14.5px;
          outline: none;
          box-sizing: border-box;
        }
        .adlg-input::placeholder { color: #6B7A95; }
        .adlg-input:focus { border-color: #FF6B5A; background: rgba(255,255,255,0.09); }
        .adlg-btn {
          width: 100%;
          height: 50px;
          margin-top: 4px;
          border-radius: 12px;
          border: none;
          background: #FF6B5A;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.15s ease, transform 0.06s ease;
          font-family: inherit;
        }
        .adlg-btn:disabled { opacity: 0.5; cursor: default; }
        .adlg-btn:not(:disabled):hover { filter: brightness(1.05); }
        .adlg-btn:not(:disabled):active { transform: translateY(1px); }
      `}</style>
    </div>
  );
}
