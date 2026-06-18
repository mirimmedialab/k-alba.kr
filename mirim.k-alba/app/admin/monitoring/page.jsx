"use client";
import { useEffect, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { adminGet } from "@/lib/adminApi";
import { Panel, Table, StatusBadge, fmtDate } from "../_ui";

const TABS = [
  { key: "sync", label: "동기화 로그" },
  { key: "staff", label: "학교 담당자 신청" },
  { key: "kakao", label: "카카오 드래프트" },
  { key: "deactivations", label: "탈퇴 사유" },
];

function initialTab() {
  if (typeof window !== "undefined") {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && TABS.some((x) => x.key === t)) return t;
  }
  return "sync";
}

export default function AdminMonitoring() {
  const [tab, setTab] = useState(initialTab);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (t = tab) => {
    setLoading(true); setErr("");
    try {
      const res = await adminGet(`/api/admin/monitoring?type=${t}`);
      setRows(res.rows || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [tab]);

  const columns = {
    sync: [
      { header: "소스", key: "source" },
      { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
      { header: "수집", align: "right", cell: (r) => (r.items_fetched ?? 0).toLocaleString() },
      { header: "신규", align: "right", cell: (r) => (r.items_new ?? 0).toLocaleString() },
      { header: "갱신", align: "right", cell: (r) => (r.items_updated ?? 0).toLocaleString() },
      { header: "실패", align: "right", cell: (r) => (r.items_failed ?? 0).toLocaleString() },
      { header: "오류", maxWidth: 220, cell: (r) => r.error || "-" },
      { header: "시작", cell: (r) => fmtDate(r.started_at) },
    ],
    staff: [
      { header: "대학", maxWidth: 180, cell: (r) => <strong>{r.university_name || "-"}</strong> },
      { header: "신청자", cell: (r) => r.applicant_name || "-" },
      { header: "직책", cell: (r) => r.applicant_position || "-" },
      { header: "이메일", maxWidth: 200, cell: (r) => r.applicant_email || "-" },
      { header: "연락처", cell: (r) => r.applicant_phone || "-" },
      { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
      { header: "신청일", cell: (r) => fmtDate(r.created_at) },
    ],
    kakao: [
      { header: "작성자", cell: (r) => r.name || (r.linked ? "-" : "미연결") },
      { header: "업체", cell: (r) => r.company_name || "-" },
      { header: "유형", cell: (r) => (r.user_type === "employer" ? "사장님" : r.user_type === "worker" ? "알바생" : r.user_type || "-") },
      { header: "공고 제목", maxWidth: 220, cell: (r) => r.draft_title || "-" },
      { header: "진행 단계", cell: (r) => (r.step == null ? "-" : `${r.step_no}/${r.step_total} · ${r.step_label}`) },
      { header: "갱신", cell: (r) => fmtDate(r.updated_at) },
    ],
    deactivations: [
      { header: "유형", cell: (r) => r.user_type || "-" },
      { header: "사유코드", cell: (r) => r.reason_code || "-" },
      { header: "사유", maxWidth: 360, wrap: true, cell: (r) => r.reason_text || "-" },
      { header: "일시", cell: (r) => fmtDate(r.created_at) },
    ],
  };

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>운영 모니터링</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>동기화 로그, 학교 담당자 승인, 카카오 드래프트, 탈퇴 사유</p>
      </header>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
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

      {err && <div style={{ padding: 12, background: T.errorBg, color: T.error, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}

      <Panel>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>불러오는 중…</div>
        ) : (
          <Table columns={columns[tab]} rows={rows} empty="기록이 없습니다." />
        )}
      </Panel>
    </div>
  );
}
