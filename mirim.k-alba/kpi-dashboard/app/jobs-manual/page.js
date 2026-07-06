"use client";

import { useEffect, useMemo, useState } from "react";

const NAVY = "#191f28";
const CORAL = "#ff6b5e";
const MUTED = "#8b95a1";
const BORDER = "#eceef1";

const td = {
  padding: "10px 12px",
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
  color: NAVY,
};

function chip(active) {
  return {
    padding: "6px 13px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    border: `1px solid ${active ? "#d7dce3" : BORDER}`,
    background: active ? "#f2f4f6" : "#fff",
    color: active ? NAVY : MUTED,
  };
}

export default function JobsManualDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [src, setSrc] = useState("all"); // all | direct | chatbot

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("src");
    if (q === "direct" || q === "chatbot") setSrc(q);
    fetch("/api/detail?type=jobs")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  const items = useMemo(() => {
    if (!data) return [];
    return data.items.filter((j) => src === "all" || j.sourceType === src);
  }, [data, src]);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 15 }}>
        공고 목록을 불러오는 중…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI 대시보드로
        </a>
        <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 8 }}>
          직접·챗봇 등록 공고 <span style={{ fontVariantNumeric: "tabular-nums" }}>{items.length}</span>건
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          고용24(worknet) 자동 수집 제외 · 최신순
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button style={chip(src === "all")} onClick={() => setSrc("all")}>전체</button>
        <button style={chip(src === "direct")} onClick={() => setSrc("direct")}>직접 등록</button>
        <button style={chip(src === "chatbot")} onClick={() => setSrc("chatbot")}>챗봇 등록</button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          padding: 20,
          overflowX: "auto",
        }}
      >
        {items.length === 0 ? (
          <div style={{ fontSize: 14, color: MUTED }}>해당 조건의 공고가 없습니다.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["등록일", "등록자", "공고 제목", "경로", "상태", "공고"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: `2px solid ${BORDER}`,
                      color: MUTED,
                      fontSize: 12.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id}>
                  <td style={td}>{new Date(j.createdAt).toLocaleDateString("ko-KR")}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{j.employer}</td>
                  <td style={{ ...td, whiteSpace: "normal", minWidth: 200, maxWidth: 360 }}>
                    {j.title}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        background: j.sourceType === "chatbot" ? "#fff3d6" : "#e8edfb",
                        color: j.sourceType === "chatbot" ? "#a06b00" : "#3452c4",
                        fontWeight: 700,
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      {j.sourceType === "chatbot" ? "챗봇" : "직접"}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: j.status === "active" ? "#1c8a4c" : MUTED, fontWeight: 600 }}>
                      {j.status === "active" ? "활성" : j.status === "expired" ? "만료" : j.status}
                    </span>
                  </td>
                  <td style={td}>
                    <a
                      href={`https://www.k-alba.kr/jobs/${j.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#2b6cb0", fontWeight: 600 }}
                    >
                      보기 ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
