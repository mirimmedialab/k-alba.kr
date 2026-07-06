"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("비밀번호가 올바르지 않습니다.");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          width: "100%",
          maxWidth: 380,
          boxShadow: "0 4px 24px rgba(26,35,64,0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "#191f28" }}>
          K-ALBA <span style={{ color: "#ff6b5e" }}>KPI</span>
        </div>
        <div style={{ fontSize: 14, color: "#8b95a1", marginTop: 6, marginBottom: 28 }}>
          내부 대시보드 — 비밀번호를 입력하세요
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          autoFocus
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "13px 14px",
            fontSize: 15,
            border: "1.5px solid #dde2ec",
            borderRadius: 10,
            outline: "none",
          }}
        />
        {error && (
          <div style={{ color: "#e5484d", fontSize: 13, marginTop: 10 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "13px 0",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            background: loading || !password ? "#b8c0d4" : "#191f28",
            border: "none",
            borderRadius: 10,
            cursor: loading || !password ? "default" : "pointer",
          }}
        >
          {loading ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </div>
  );
}
