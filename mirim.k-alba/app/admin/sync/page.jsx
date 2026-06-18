"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { adminGet } from "@/lib/adminApi";
import { Panel, Stat, Table, fmtDateTime, fmtDuration } from "../_ui";

const STALE_MS = 30 * 60 * 1000; // running이 이 시간 넘으면 미완료로 간주

function isStale(log) {
  return log.status === "running" && Date.now() - new Date(log.started_at).getTime() > STALE_MS;
}

function StatusCell({ log }) {
  let bg, fg, label;
  if (log.status === "success") { bg = T.successBg; fg = "#0A8F6B"; label = "✓ 성공"; }
  else if (log.status === "failed" || log.status === "error") { bg = T.errorBg; fg = T.error; label = "✗ 실패"; }
  else if (isStale(log)) { bg = T.errorBg; fg = T.error; label = "⚠ 미완료"; }
  else if (log.status === "running") { bg = T.infoBg; fg = T.info; label = "진행중"; }
  else { bg = T.g100; fg = T.ink2; label = log.status || "-"; }
  return (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: bg, color: fg, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function completeCell(log) {
  if (log.status === "running") return isStale(log) ? "미완료" : "진행중";
  if (!log.completed_at) return "-";
  return fmtDuration(log.started_at, log.completed_at);
}

const SOURCE_LABEL = { worknet: "WorkNet", agriwork: "AgriWork" };

const TABS = [
  { key: "collect", label: "수집" },
  { key: "cleanup", label: "갱신(정리)" },
];

export default function AdminSyncPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("collect");
  const [collect, setCollect] = useState([]);
  const [cleanup, setCleanup] = useState([]);
  const [sourceCounts, setSourceCounts] = useState({});

  // 인증은 상위 admin/layout.jsx(kalba_admin 쿠키 게이트)에서 처리.
  useEffect(() => {
    (async () => {
      try {
        const res = await adminGet("/api/admin/sync");
        setCollect(res.collect || []);
        setCleanup(res.cleanup || []);
        setSourceCounts(res.sourceCounts || {});
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const collectCols = [
    { header: "소스", cell: (r) => SOURCE_LABEL[r.source] || r.source },
    { header: "상태", cell: (r) => <StatusCell log={r} /> },
    { header: "수집", align: "right", cell: (r) => (r.items_fetched ?? 0).toLocaleString() },
    { header: "신규", align: "right", cell: (r) => (r.items_new ?? 0).toLocaleString() },
    { header: "실패", align: "right", cell: (r) => (r.items_failed ?? 0).toLocaleString() },
    { header: "시작", cell: (r) => fmtDateTime(r.started_at) },
    { header: "완료/소요", cell: (r) => completeCell(r) },
    { header: "오류", maxWidth: 220, wrap: true, cell: (r) => r.error || "-" },
  ];

  const cleanupCols = [
    { header: "상태", cell: (r) => <StatusCell log={r} /> },
    { header: "정리 건수", align: "right", cell: (r) => (r.items_updated ?? 0).toLocaleString() },
    { header: "시작", cell: (r) => fmtDateTime(r.started_at) },
    { header: "완료/소요", cell: (r) => completeCell(r) },
    { header: "오류", maxWidth: 220, wrap: true, cell: (r) => r.error || "-" },
  ];

  const rows = tab === "collect" ? collect : cleanup;
  const cols = tab === "collect" ? collectCols : cleanupCols;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>데이터 동기화</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>
          외부 공고 수집(WorkNet 등)과 만료 공고 정리(cleanup) 실행 이력입니다.
        </p>
      </header>

      {/* 소스별 현재 DB 공고 수 */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <Stat label="WorkNet 공고" value={(sourceCounts.worknet || 0).toLocaleString()} accent={T.navy} />
        <Stat label="AgriWork 공고" value={(sourceCounts.agriwork || 0).toLocaleString()} accent={T.gold} />
        <Stat label="직접 등록 공고" value={(sourceCounts.direct || 0).toLocaleString()} accent={T.coral} />
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "10px 16px", fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? T.coral : T.ink3, background: "transparent", border: "none",
              borderBottom: tab === t.key ? `2px solid ${T.coral}` : "2px solid transparent",
              cursor: "pointer", marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>불러오는 중…</div>
        ) : (
          <Table columns={cols} rows={rows} empty="기록이 없습니다." />
        )}
      </Panel>
    </div>
  );
}
