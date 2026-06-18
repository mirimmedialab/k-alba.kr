"use client";
import { useEffect, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { adminGet, adminPatch } from "@/lib/adminApi";
import { Panel, Table, StatusBadge, MiniBtn, Pager, TextInput, SelectInput, fmtDate } from "../_ui";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (p = page) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ q, type, status, page: String(p), limit: "20" });
      const res = await adminGet(`/api/admin/users?${params}`);
      setData(res); setPage(res.page);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [q, type, status, page]);

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [type, status]);
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);

  const act = async (id, action) => {
    const labels = { deactivate: "비활성화", reactivate: "활성화", verify: "인증", unverify: "인증 해제" };
    if (action === "deactivate" && !confirm("이 회원을 비활성화할까요? (로그인 차단)")) return;
    try {
      const res = await adminPatch("/api/admin/users", { id, action });
      setData((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? res.row : r)) }));
    } catch (e) { alert(`${labels[action]} 실패: ${e.message}`); }
  };

  const userTypeBadge = (t) =>
    t === "employer"
      ? <span style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>사장님</span>
      : t === "worker"
      ? <span style={{ fontSize: 11, fontWeight: 700, color: T.coral }}>알바생</span>
      : <span style={{ fontSize: 11, color: T.ink3 }}>{t || "-"}</span>;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>회원 관리</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>알바생·사장님 조회, 사업자 인증, 계정 비활성화</p>
      </header>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <TextInput value={q} onChange={setQ} onEnter={() => load(1)} placeholder="이름·이메일·전화·업체명 검색" />
        <SelectInput value={type} onChange={setType} options={[
          { value: "all", label: "전체 유형" }, { value: "worker", label: "알바생" }, { value: "employer", label: "사장님" },
        ]} />
        <SelectInput value={status} onChange={setStatus} options={[
          { value: "all", label: "전체 상태" }, { value: "active", label: "활성" }, { value: "deactivated", label: "비활성" },
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
                { header: "이름", cell: (r) => <strong>{r.name || "-"}</strong> },
                { header: "유형", cell: (r) => userTypeBadge(r.user_type) },
                { header: "이메일", key: "email", maxWidth: 200 },
                { header: "연락처", cell: (r) => r.phone || "-" },
                { header: "비자/국적", cell: (r) => [r.visa, r.nationality || r.country].filter(Boolean).join(" · ") || "-" },
                { header: "업체/인증", cell: (r) => r.user_type === "employer"
                    ? <span>{r.company_name || "-"} {r.verified ? <span style={{ color: "#0A8F6B", fontWeight: 700 }}>✓</span> : <span style={{ color: T.ink3 }}>미인증</span>}</span>
                    : "-" },
                { header: "상태", cell: (r) => <StatusBadge value={r.deactivated_at ? "deleted" : "active"} /> },
                { header: "가입", cell: (r) => fmtDate(r.created_at) },
                { header: "관리", cell: (r) => (
                    <div style={{ display: "flex", gap: 6 }}>
                      {r.user_type === "employer" && (r.verified
                        ? <MiniBtn onClick={() => act(r.id, "unverify")}>인증해제</MiniBtn>
                        : <MiniBtn tone="success" onClick={() => act(r.id, "verify")}>인증</MiniBtn>)}
                      {r.deactivated_at
                        ? <MiniBtn tone="success" onClick={() => act(r.id, "reactivate")}>활성화</MiniBtn>
                        : <MiniBtn tone="danger" onClick={() => act(r.id, "deactivate")}>비활성</MiniBtn>}
                    </div>
                  ) },
              ]}
              rows={data.rows}
              empty="조건에 맞는 회원이 없습니다."
            />
            <Pager page={data.page} total={data.total} limit={data.limit} onPage={(p) => load(p)} />
          </>
        )}
      </Panel>
    </div>
  );
}
