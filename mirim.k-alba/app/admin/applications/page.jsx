"use client";
import { useEffect, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { adminGet } from "@/lib/adminApi";
import { Panel, Table, StatusBadge, Pager, fmtDate, fmtPay } from "../_ui";

const TABS = [
  { key: "applications", label: "알바 지원" },
  { key: "partwork", label: "시간제취업 신청" },
  { key: "contracts", label: "근로계약서" },
];

export default function AdminApplications() {
  const [tab, setTab] = useState("applications");
  const [data, setData] = useState({ rows: [], total: 0, limit: 20, page: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (p = 1, t = tab) => {
    setLoading(true); setErr("");
    try {
      const res = await adminGet(`/api/admin/applications?type=${t}&page=${p}&limit=20`);
      setData(res);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(1, tab); /* eslint-disable-next-line */ }, [tab]);

  const columns = {
    applications: [
      { header: "지원자", cell: (r) => <strong>{r.applicant?.name || "-"}</strong> },
      { header: "비자/국적", cell: (r) => [r.applicant?.visa, r.applicant?.nationality].filter(Boolean).join(" · ") || "-" },
      { header: "공고", maxWidth: 240, cell: (r) => r.job?.title || "-" },
      { header: "지역", cell: (r) => r.job?.sigungu || "-" },
      { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
      { header: "지원일", cell: (r) => fmtDate(r.created_at) },
    ],
    partwork: [
      { header: "신청자", cell: (r) => <strong>{r.applicant_name || "-"}</strong> },
      { header: "비자", cell: (r) => r.visa || "-" },
      { header: "대학", maxWidth: 180, cell: (r) => r.university_name || "-" },
      { header: "고용주", maxWidth: 160, cell: (r) => r.employer_name || "-" },
      { header: "주당시간", align: "right", cell: (r) => r.weekly_hours ? `${r.weekly_hours}h` : "-" },
      { header: "시급", align: "right", cell: (r) => r.hourly_pay ? `${Number(r.hourly_pay).toLocaleString()}원` : "-" },
      { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
      { header: "신청일", cell: (r) => fmtDate(r.created_at) },
    ],
    contracts: [
      { header: "근로자", cell: (r) => <strong>{r.worker_name || "-"}</strong> },
      { header: "사업장", maxWidth: 180, cell: (r) => r.company_name || r.employer_name || "-" },
      { header: "직무", maxWidth: 160, cell: (r) => r.job_title || "-" },
      { header: "급여", cell: (r) => r.hourly_pay ? `시급 ${Number(r.hourly_pay).toLocaleString()}원` : fmtPay(r.pay_type, r.pay_amount) },
      { header: "서명", cell: (r) => (
          <span style={{ fontSize: 12 }}>
            <span style={{ color: r.worker_signed ? "#0A8F6B" : T.ink3 }}>근로자{r.worker_signed ? "✓" : "✗"}</span>{" / "}
            <span style={{ color: r.employer_signed ? "#0A8F6B" : T.ink3 }}>사업주{r.employer_signed ? "✓" : "✗"}</span>
          </span>
        ) },
      { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
      { header: "작성일", cell: (r) => fmtDate(r.created_at) },
    ],
  };

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>지원·매칭 현황</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>지원 내역, 시간제취업 신청, 근로계약서 모니터링 (읽기 전용)</p>
      </header>

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

      {err && <div style={{ padding: 12, background: T.errorBg, color: T.error, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}

      <Panel>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>불러오는 중…</div>
        ) : (
          <>
            <Table columns={columns[tab]} rows={data.rows} empty="기록이 없습니다." />
            <Pager page={data.page} total={data.total} limit={data.limit} onPage={(p) => load(p, tab)} />
          </>
        )}
      </Panel>
    </div>
  );
}
