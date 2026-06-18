"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { adminGet, adminPatch, adminDelete } from "@/lib/adminApi";
import { Panel, Table, StatusBadge, MiniBtn, Pager, TextInput, SelectInput, fmtDate, fmtPay } from "../_ui";

export default function AdminJobs() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [data, setData] = useState({ rows: [], total: 0, limit: 20, page: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ q, status, source, page: String(p), limit: "20" });
      const res = await adminGet(`/api/admin/jobs?${params}`);
      setData(res);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [q, status, source]);

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [status, source]);
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  const setJobStatus = async (id, newStatus) => {
    try {
      const res = await adminPatch("/api/admin/jobs", { id, status: newStatus });
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? res.row : r)) }));
    } catch (e) { alert(`상태 변경 실패: ${e.message}`); }
  };

  const remove = async (id) => {
    if (!confirm("이 공고를 영구 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await adminDelete(`/api/admin/jobs?id=${id}`);
      setData((d) => ({ ...d, rows: d.rows.filter((r) => r.id !== id), total: d.total - 1 }));
    } catch (e) { alert(`삭제 실패: ${e.message}`); }
  };

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>공고 관리</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>공고 검색·필터, 상태 변경(활성/마감/숨김), 삭제</p>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <TextInput value={q} onChange={setQ} onEnter={() => load(1)} placeholder="제목·주소·업체명 검색" />
        <SelectInput value={status} onChange={setStatus} options={[
          { value: "all", label: "전체 상태" }, { value: "active", label: "활성" }, { value: "closed", label: "마감" }, { value: "hidden", label: "숨김" },
        ]} />
        <SelectInput value={source} onChange={setSource} options={[
          { value: "all", label: "전체 출처" }, { value: "direct", label: "직접 등록" }, { value: "external", label: "외부 수집" },
        ]} />
        <MiniBtn tone="primary" onClick={() => load(1)}>검색</MiniBtn>
      </div>

      {err && <div style={{ padding: 12, background: T.errorBg, color: T.error, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{err}</div>}

      <Panel>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>불러오는 중…</div>
        ) : (
          <>
            <Table
              columns={[
                { header: "제목", maxWidth: 260, cell: (r) => (
                    <Link href={`/jobs/${r.id}`} target="_blank" style={{ color: T.ink, fontWeight: 600, textDecoration: "none" }}>
                      {r.title || "(제목 없음)"}
                    </Link>
                  ) },
                { header: "업체", maxWidth: 140, cell: (r) => r.employer?.company_name || r.employer?.name || r.employer_external_name || "-" },
                { header: "지역", cell: (r) => [r.sido, r.sigungu].filter(Boolean).join(" ") || "-" },
                { header: "급여", cell: (r) => fmtPay(r.pay_type, r.pay_amount) },
                { header: "출처", cell: (r) => (!r.source_type || r.source_type === "direct")
                    ? <span style={{ fontSize: 11, color: T.coral, fontWeight: 700 }}>직접</span>
                    : <span style={{ fontSize: 11, color: T.ink3 }}>{r.source_type}</span> },
                { header: "상태", cell: (r) => <StatusBadge value={r.status} /> },
                { header: "등록", cell: (r) => fmtDate(r.created_at) },
                { header: "관리", cell: (r) => (
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.status === "active"
                        ? <MiniBtn onClick={() => setJobStatus(r.id, "closed")}>마감</MiniBtn>
                        : <MiniBtn tone="success" onClick={() => setJobStatus(r.id, "active")}>활성</MiniBtn>}
                      {r.status !== "hidden"
                        ? <MiniBtn onClick={() => setJobStatus(r.id, "hidden")}>숨김</MiniBtn>
                        : <MiniBtn tone="success" onClick={() => setJobStatus(r.id, "active")}>복구</MiniBtn>}
                      <MiniBtn tone="danger" onClick={() => remove(r.id)}>삭제</MiniBtn>
                    </div>
                  ) },
              ]}
              rows={data.rows}
              empty="조건에 맞는 공고가 없습니다."
            />
            <Pager page={data.page} total={data.total} limit={data.limit} onPage={(p) => load(p)} />
          </>
        )}
      </Panel>
    </div>
  );
}
