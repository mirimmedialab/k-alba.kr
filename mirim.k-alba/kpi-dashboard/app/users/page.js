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

function Seg({ options, value, onChange }) {
  return (
    <div
      style={{
        display: "inline-flex",
        border: `1px solid ${BORDER}`,
        borderRadius: 9,
        padding: 2,
        background: "#fff",
      }}
    >
      {options.map(([k, label]) => {
        const active = value === k;
        return (
          <button
            key={k}
            onClick={() => onChange(k)}
            style={{
              border: "none",
              padding: "5px 12px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: active ? 600 : 400,
              background: active ? FILL : "transparent",
              color: active ? INK : MUTED,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function dkey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function TypeLabel({ t }) {
  const isWorker = t === "worker";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: isWorker ? "#4c7cf0" : ACCENT,
          display: "inline-block",
        }}
      />
      {isWorker ? "알바생" : "사장님"}
    </span>
  );
}

export default function UsersDetail() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");
  const [type, setType] = useState("all");
  const [view, setView] = useState("calendar");
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
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 14 }}>
        가입자 목록을 불러오는 중…
      </div>
    );
  }

  const y = month.getFullYear();
  const mo = month.getMonth();
  const firstDow = new Date(y, mo, 1).getDay();
  const daysInMonth = new Date(y, mo + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const maxCnt = Math.max(1, ...Object.values(byDay));
  const todayKey = dkey(new Date().toISOString());

  const navBtn = {
    border: "none",
    background: "transparent",
    color: MUTED,
    fontSize: 13,
    cursor: "pointer",
    padding: "4px 8px",
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 64px" }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/" style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}>
          ← KPI
        </a>
        <div style={{ fontSize: 18, fontWeight: 700, color: INK, marginTop: 10 }}>
          {tab === "active" ? "가입자" : "탈퇴자"}{" "}
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{filtered.length}</span>
          <span style={{ color: MUTED, fontWeight: 400, fontSize: 14 }}>명</span>
        </div>
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
        <Seg
          options={[
            ["active", "회원"],
            ["deactivated", "탈퇴회원"],
          ]}
          value={tab}
          onChange={(v) => {
            setTab(v);
            setSelectedDay("");
          }}
        />
        <Seg
          options={[
            ["all", "전체"],
            ["worker", "알바생"],
            ["employer", "사장님"],
          ]}
          value={type}
          onChange={setType}
        />
        <span style={{ flex: 1 }} />
        <Seg
          options={[
            ["calendar", "달력"],
            ["list", "리스트"],
          ]}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "list") setSelectedDay("");
          }}
        />
      </div>

      {/* 달력 */}
      {view === "calendar" && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <button
              style={navBtn}
              onClick={() => {
                setMonth(new Date(y, mo - 1, 1));
                setSelectedDay("");
              }}
            >
              ← 이전 달
            </button>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: INK }}>
              {y}년 {mo + 1}월{" "}
              <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>
                {tab === "active" ? "가입일" : "탈퇴일"} 기준
              </span>
            </div>
            <button
              style={navBtn}
              onClick={() => {
                setMonth(new Date(y, mo + 1, 1));
                setSelectedDay("");
              }}
            >
              다음 달 →
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11.5,
                  color: MUTED,
                  padding: "4px 0 6px",
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
              const alpha = cnt ? 0.05 + 0.13 * (cnt / maxCnt) : 0;
              return (
                <div
                  key={k}
                  onClick={() => cnt && setSelectedDay(sel ? "" : k)}
                  style={{
                    minHeight: 54,
                    borderRadius: 8,
                    background: cnt ? `rgba(255,107,94,${alpha})` : "transparent",
                    boxShadow: sel ? `inset 0 0 0 1.5px ${INK}` : "none",
                    cursor: cnt ? "pointer" : "default",
                    padding: "6px 8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      color: k === todayKey ? ACCENT : MUTED,
                      fontWeight: k === todayKey ? 700 : 400,
                    }}
                  >
                    {d}
                  </div>
                  {cnt > 0 && (
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: INK,
                        marginTop: 2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {cnt}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 12 }}>
            {selectedDay ? (
              <>
                <b style={{ color: INK, fontWeight: 600 }}>{selectedDay}</b> 명단이 아래에
                표시됩니다 · 다시 클릭하면 해제
              </>
            ) : (
              "숫자가 있는 날짜를 클릭하면 해당일 명단이 표시됩니다"
            )}
          </div>
        </div>
      )}

      {/* 리스트 */}
      <div className="card" style={{ overflowX: "auto" }}>
        {dayList.length === 0 ? (
          <div style={{ fontSize: 13.5, color: MUTED }}>해당 조건의 회원이 없습니다.</div>
        ) : (
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
            <thead>
              <tr>
                {["이름", "유형", "국적", tab === "active" ? "가입일" : "가입일 / 탈퇴일"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
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
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {dayList.map((u, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 500 }}>{u.name}</td>
                  <td style={td}>
                    <TypeLabel t={u.userType} />
                  </td>
                  <td style={{ ...td, color: MUTED }}>{u.nationality || "–"}</td>
                  <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>
                    {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                    {tab === "deactivated" && u.deactivatedAt && (
                      <span style={{ color: MUTED, marginLeft: 8 }}>
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
