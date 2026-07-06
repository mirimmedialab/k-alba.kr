"use client";

import { useEffect, useState } from "react";

const NAVY = "#1a2340";
const CORAL = "#ff6b5e";
const MUTED = "#8a93a8";
const BORDER = "#e6eaf2";

const td = {
  padding: "10px 12px",
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
  color: NAVY,
};
const tdNum = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function n(v) {
  return typeof v === "number" ? v.toLocaleString() : "–";
}

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

  const mk = data.marketing || null;
  const items = (mk && mk.items) || [];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI 대시보드로
        </a>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginTop: 8 }}>
          발행 콘텐츠 <span style={{ color: CORAL }}>{items.length}</span>건
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
          구글시트 [K-ALBA]성과 탭 · 최신순 · K-univ 제외
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
        {items.length === 0 ? (
          <div style={{ fontSize: 14, color: MUTED }}>
            {data.metricsError ? `⚠️ ${data.metricsError}` : "발행된 콘텐츠가 없습니다."}
          </div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {[
                  ["날짜", "left"],
                  ["채널", "left"],
                  ["제목", "left"],
                  ["조회(D+1)", "right"],
                  ["조회(D+3)", "right"],
                  ["조회(D+7)", "right"],
                  ["좋아요", "right"],
                  ["댓글", "right"],
                  ["공유", "right"],
                  ["링크", "left"],
                ].map(([h, align]) => (
                  <th
                    key={h}
                    style={{
                      textAlign: align,
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
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={td}>{it.date || "–"}</td>
                  <td style={td}>
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
                      {it.channel}
                    </span>
                  </td>
                  <td
                    style={{
                      ...td,
                      whiteSpace: "normal",
                      minWidth: 200,
                      maxWidth: 340,
                      fontWeight: 600,
                    }}
                  >
                    {it.title || "(제목 없음)"}
                  </td>
                  <td style={tdNum}>{n(it.viewsD1)}</td>
                  <td style={tdNum}>{n(it.viewsD3)}</td>
                  <td style={tdNum}>{n(it.viewsD7)}</td>
                  <td style={tdNum}>{n(it.likes)}</td>
                  <td style={tdNum}>{n(it.comments)}</td>
                  <td style={tdNum}>{n(it.shares)}</td>
                  <td style={td}>
                    {it.url ? (
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2b6cb0", fontWeight: 600 }}
                      >
                        보기 ↗
                      </a>
                    ) : (
                      <span style={{ color: MUTED }}>–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <a
          href="https://docs.google.com/spreadsheets/d/1cgYYoJk5O7mJsmA-maZAMbNE8z6PV750-22hjDZvpYw/edit?gid=1912359929"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: "#fff",
            border: `1.5px solid ${BORDER}`,
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            color: NAVY,
            textDecoration: "none",
          }}
        >
          📄 원본 시트 바로가기 ↗
        </a>
      </div>
    </div>
  );
}
