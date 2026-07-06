"use client";

import { useEffect, useMemo, useState } from "react";

const INK = "#191f28";
const MUTED = "#8b95a1";
const BORDER = "#eceef1";
const ACCENT = "#ff6b5e";
const FILL = "#f2f4f6";

const td = {
  padding: "10px 12px",
  borderBottom: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
  color: INK,
};
const tdNum = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function n(v) {
  return typeof v === "number" ? v.toLocaleString() : "–";
}

const CHANNELS = ["전체", "틱톡", "페이스북", "인스타그램", "스레드"];

export default function MarketingDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [ch, setCh] = useState("전체");
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const pc = sp.get("ch");
    if (pc && CHANNELS.includes(pc)) setCh(pc);
    if (sp.get("date")) setDate(sp.get("date"));
    if (sp.get("q")) setQ(sp.get("q"));
    fetch("/api/kpi")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  const all = (data && data.marketing && data.marketing.items) || [];
  const items = useMemo(() => {
    return all.filter((it) => {
      if (ch !== "전체" && it.channel !== ch) return false;
      if (date) {
        const k = it.ts ? new Date(it.ts).toISOString().slice(0, 10) : "";
        if (k !== date) return false;
      }
      if (q && !(it.title || "").includes(q)) return false;
      return true;
    });
  }, [all, ch, date, q]);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 14 }}>
        발행 콘텐츠를 불러오는 중…
      </div>
    );
  }

  const chipStyle = (active) => ({
    border: "none",
    padding: "5px 12px",
    borderRadius: 7,
    fontSize: 12.5,
    fontWeight: active ? 600 : 400,
    background: active ? FILL : "transparent",
    color: active ? INK : MUTED,
    cursor: "pointer",
  });

  const clearChip = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: `1px solid ${BORDER}`,
    background: "#fff",
    borderRadius: 8,
    padding: "5px 10px",
    fontSize: 12.5,
    color: INK,
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI
        </a>
        <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginTop: 10 }}>
          발행 콘텐츠 <span style={{ fontVariantNumeric: "tabular-nums" }}>{items.length}</span>
          <span style={{ color: MUTED, fontWeight: 400, fontSize: 14 }}>건</span>
        </div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>최신순 · 발행완료 기준</div>
      </div>

      {/* 필터 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            border: `1px solid ${BORDER}`,
            borderRadius: 9,
            padding: 2,
            background: "#fff",
          }}
        >
          {CHANNELS.map((c) => (
            <button key={c} style={chipStyle(ch === c)} onClick={() => setCh(c)}>
              {c}
            </button>
          ))}
        </div>
        {date && (
          <button style={clearChip} onClick={() => setDate("")}>
            {date} <span style={{ color: MUTED }}>✕</span>
          </button>
        )}
        {q && (
          <button style={clearChip} onClick={() => setQ("")}>
            "{q}" <span style={{ color: MUTED }}>✕</span>
          </button>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>
            {data.metricsError ? `${data.metricsError}` : "조건에 맞는 콘텐츠가 없습니다."}
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
                      borderBottom: `1px solid ${BORDER}`,
                      color: MUTED,
                      fontSize: 12,
                      fontWeight: 500,
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
                    <button
                      onClick={() => setCh(it.channel)}
                      style={{
                        border: "none",
                        background: FILL,
                        color: INK,
                        fontWeight: 500,
                        fontSize: 12,
                        padding: "3px 10px",
                        borderRadius: 7,
                        cursor: "pointer",
                      }}
                    >
                      {it.channel}
                    </button>
                  </td>
                  <td
                    style={{
                      ...td,
                      whiteSpace: "normal",
                      minWidth: 200,
                      maxWidth: 340,
                      fontWeight: 500,
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
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: INK,
            textDecoration: "none",
          }}
        >
          원본 시트 열기 ↗
        </a>
      </div>
    </div>
  );
}
