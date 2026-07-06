"use client";

import { useEffect, useState } from "react";

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

const STATUS_KO = {
  pending: ["대기", "#a06b00", "#fff3d6"],
  accepted: ["수락", "#1c8a4c", "#e2f6ea"],
  rejected: ["거절", "#c0392b", "#fdeaea"],
};

export default function ApplicationsDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/detail?type=applications")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 15 }}>
        지원 내역을 불러오는 중…
      </div>
    );
  }

  const items = data.items || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI 대시보드로
        </a>
        <div style={{ fontSize: 18, fontWeight: 700, color: NAVY, marginTop: 8 }}>
          누적 지원 <span style={{ fontVariantNumeric: "tabular-nums" }}>{items.length}</span>건
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>최신순</div>
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
          <div style={{ fontSize: 14, color: MUTED }}>지원 내역이 없습니다.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["지원일", "지원자", "공고", "상태"].map((h) => (
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
              {items.map((a, i) => {
                const [label, color, bg] = STATUS_KO[a.status] || [a.status, MUTED, "#eef1f7"];
                return (
                  <tr key={i}>
                    <td style={td}>{new Date(a.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{a.applicant}</td>
                    <td style={{ ...td, whiteSpace: "normal", minWidth: 200, maxWidth: 380 }}>
                      <a
                        href={`https://www.k-alba.kr/jobs/${a.jobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#2b6cb0", fontWeight: 600 }}
                      >
                        {a.jobTitle} ↗
                      </a>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          background: bg,
                          color,
                          fontWeight: 700,
                          fontSize: 12,
                          padding: "3px 10px",
                          borderRadius: 20,
                        }}
                      >
                        {label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
