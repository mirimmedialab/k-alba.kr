"use client";

import { useEffect, useMemo, useState } from "react";

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

function chip(active) {
  return {
    padding: "7px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    border: `1.5px solid ${active ? NAVY : BORDER}`,
    background: active ? NAVY : "#fff",
    color: active ? "#fff" : MUTED,
  };
}

function dkey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function typeBadge(t) {
  const isWorker = t === "worker";
  return (
    <span
      style={{
        background: isWorker ? "#e8edfb" : "#ffe9e6",
        color: isWorker ? "#3452c4" : CORAL,
        fontWeight: 700,
        fontSize: 12,
        padding: "3px 10px",
        borderRadius: 20,
      }}
    >
      {isWorker ? "알바생" : "사장님"}
    </span>
  );
}

export default function UsersDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active"); // active | deactivated
  const [type, setType] = useState("all"); // all | worker | employer
  const [view, setView] = useState("calendar"); // calendar | list
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    fetch("/api/detail?type=users")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.items.filter(
      (u) =>
        (tab === "active" ? !u.deactivated : u.deactivated) &&
        (type === "all" || u.userType === type)
    );
  }, [data, tab, type]);

  const byDay = useMemo(() => {
    const m = {};
    for (const u of filtered) {
      const k = dkey(tab === "deactivated" && u.deactivatedAt ? u.deactivatedAt : u.createdAt);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [filtered, tab]);

  const dayList = useMemo(() => {
    if (!selectedDay) return filtered;
    return filtered.filter(
      (u) =>
        dkey(tab === "deactivated" && u.deactivatedAt ? u.deactivatedAt : u.createdAt) ===
        selectedDay
    );
  }, [filtered, selectedDay, tab]);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 15 }}>
        가입자 목록을 불러오는 중…
      </div>
    );
  }

  /* ----- 달력 그리드 ----- */
  const y = month.getFullYear();
  const mo = month.getMonth();
  const firstDow = new Date(y, mo, 1).getDay(); // 일요일 시작
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const maxCnt = Math.max(1, ...Object.values(byDay));
  const monthLabel = `${y}년 ${mo + 1}월`;
  const todayKey = dkey(new Date().toISOString());

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI 대시보드로
        </a>
        <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginTop: 8 }}>
          가입자 <span style={{ color: CORAL }}>{filtered.length}</span>명
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <button style={chip(tab === "active")} onClick={() => { setTab("active"); setSelectedDay(""); }}>
          회원
        </button>
        <button style={chip(tab === "deactivated")} onClick={() => { setTab("deactivated"); setSelectedDay(""); }}>
          탈퇴회원
        </button>
        <span style={{ width: 12 }} />
        <button style={chip(type === "all")} onClick={() => setType("all")}>전체</button>
        <button style={chip(type === "worker")} onClick={() => setType("worker")}>알바생</button>
        <button style={chip(type === "employer")} onClick={() => setType("employer")}>사장님</button>
        <span style={{ flex: 1 }} />
        <button style={chip(view === "calendar")} onClick={() => setView("calendar")}>📅 달력</button>
        <button style={chip(view === "list")} onClick={() => { setView("list"); setSelectedDay(""); }}>☰ 리스트</button>
      </div>

      {/* 달력 */}
      {view === "calendar" && (
        <div
          style={{
            background: "#fff",
            borderRadius: 14,
            border: `1px solid ${BORDER}`,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button style={chip(false)} onClick={() => { setMonth(new Date(y, mo - 1, 1)); setSelectedDay(""); }}>
              ← 이전
            </button>
            <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>
              {monthLabel}
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 500, marginLeft: 8 }}>
                {tab === "active" ? "가입" : "탈퇴"} 기준
              </span>
            </div>
            <button style={chip(false)} onClick={() => { setMonth(new Date(y, mo + 1, 1)); setSelectedDay(""); }}>
              다음 →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: i === 0 ? CORAL : MUTED,
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const k = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const cnt = byDay[k] || 0;
              const sel = selectedDay === k;
              const alpha = cnt ? 0.15 + 0.55 * (cnt / maxCnt) : 0;
              return (
                <div
                  key={k}
                  onClick={() => setSelectedDay(sel ? "" : k)}
                  style={{
                    minHeight: 58,
                    borderRadius: 10,
                    border: sel ? `2px solid ${CORAL}` : `1px solid ${k === todayKey ? NAVY : BORDER}`,
                    background: cnt ? `rgba(255,107,94,${alpha})` : "#fafbfd",
                    cursor: cnt ? "pointer" : "default",
                    padding: "6px 8px",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{d}</div>
                  {cnt > 0 && (
                    <div style={{ fontSize: 16, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                      {cnt}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 10 }}>
            숫자가 있는 날짜를 클릭하면 아래에 해당 날짜 명단이 표시됩니다.
            {selectedDay && (
              <b style={{ color: CORAL, marginLeft: 6 }}>
                {selectedDay} 선택됨 (다시 클릭하면 해제)
              </b>
            )}
          </div>
        </div>
      )}

      {/* 리스트 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: `1px solid ${BORDER}`,
          padding: 20,
          overflowX: "auto",
        }}
      >
        {dayList.length === 0 ? (
          <div style={{ fontSize: 14, color: MUTED }}>해당 조건의 회원이 없습니다.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["이름", "유형", "국적", tab === "active" ? "가입일" : "가입일 / 탈퇴일"].map((h) => (
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
              {dayList.map((u, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 600 }}>{u.name}</td>
                  <td style={td}>{typeBadge(u.userType)}</td>
                  <td style={td}>{u.nationality || "–"}</td>
                  <td style={td}>
                    {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                    {tab === "deactivated" && u.deactivatedAt && (
                      <span style={{ color: CORAL, marginLeft: 8 }}>
                        → {new Date(u.deactivatedAt).toLocaleDateString("ko-KR")}
                      </span>
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
