"use client";

import { useEffect, useState } from "react";

const NAVY = "#1a2340";
const CORAL = "#ff6b5e";
const MUTED = "#8a93a8";
const BORDER = "#e6eaf2";

export default function MarketingDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/kpi")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 15 }}>
        발행 콘텐츠를 불러오는 중…
      </div>
    );
  }

  const posts = (data.content && data.content.posts) || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI 대시보드로
        </a>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginTop: 8 }}>
          발행 콘텐츠 <span style={{ color: CORAL }}>{posts.length}</span>건
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          구글시트 [K-ABLA]Content 탭 · 발행완료만 (K-univ 제외)
        </div>
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
        {posts.length === 0 ? (
          <div style={{ fontSize: 14, color: MUTED }}>
            {data.contentError ? `⚠️ ${data.contentError}` : "발행완료된 콘텐츠가 없습니다."}
          </div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
            <thead>
              <tr>
                {["날짜", "채널", "주제", "게시물 링크"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderBottom: `2px solid ${BORDER}`,
                      color: MUTED,
                      fontSize: 13,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => (
                <tr key={i}>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", color: NAVY }}>
                    {p.date || "–"}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        background: "#ffe9e6",
                        color: CORAL,
                        fontWeight: 700,
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 20,
                      }}
                    >
                      {p.channel}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, color: NAVY, maxWidth: 420 }}>
                    {p.subject || p.title || "–"}
                  </td>
                  <td style={{ padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2b6cb0", fontWeight: 600 }}
                      >
                        게시물 보기 ↗
                      </a>
                    ) : (
                      <span style={{ color: MUTED }}>링크 없음</span>
                    )}
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
