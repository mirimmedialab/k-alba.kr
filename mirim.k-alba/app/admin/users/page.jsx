"use client";
import { useEffect, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { adminGet, adminPatch } from "@/lib/adminApi";
import { Panel, Table, MiniBtn, Pager, TextInput, SelectInput, fmtDateTime } from "../_ui";

const TABS = [
  { key: "active", label: "회원" },
  { key: "deactivated", label: "탈퇴 회원" },
];

export default function AdminUsers() {
  const [tab, setTab] = useState("active"); // active | deactivated
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, activeTotal: 0, deactivatedTotal: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async (p = 1) => {
    setLoading(true); setErr("");
    try {
      const params = new URLSearchParams({ q, type, status: tab, page: String(p), limit: "20" });
      const res = await adminGet(`/api/admin/users?${params}`);
      setData(res); setPage(res.page);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [q, type, tab]);

  // 탭/유형 변경 시 1페이지부터 다시 로드
  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [tab, type]);

  const act = async (id, action) => {
    const labels = { deactivate: "비활성화", reactivate: "활성화", verify: "인증", unverify: "인증 해제" };
    if (action === "deactivate" && !confirm("이 회원을 비활성화할까요? (로그인 차단)")) return;
    if (action === "reactivate" && !confirm("이 회원을 다시 활성화할까요?")) return;
    try {
      await adminPatch("/api/admin/users", { id, action });
      await load(page); // 상태 변경 시 해당 탭 목록·카운트 갱신
    } catch (e) { alert(`${labels[action]} 실패: ${e.message}`); }
  };

  const userTypeBadge = (t) =>
    t === "employer"
      ? <span style={{ fontSize: 11, fontWeight: 700, color: T.gold }}>사장님</span>
      : t === "worker"
      ? <span style={{ fontSize: 11, fontWeight: 700, color: T.coral }}>알바생</span>
      : <span style={{ fontSize: 11, color: T.ink3 }}>{t || "-"}</span>;

  const filterActive = q.trim() !== "" || type !== "all";

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>회원 관리</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>알바생·사장님 조회, 사업자 인증, 계정 비활성화</p>
      </header>

      {/* 탭: 회원 / 탈퇴 회원 (각 인원수 표시) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, borderBottom: `1px solid ${T.border}` }}>
        {TABS.map((t) => {
          const count = t.key === "active" ? data.activeTotal : data.deactivatedTotal;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 16px", fontSize: 14, fontWeight: on ? 700 : 500,
                color: on ? T.coral : T.ink3, background: "transparent", border: "none",
                borderBottom: on ? `2px solid ${T.coral}` : "2px solid transparent",
                cursor: "pointer", marginBottom: -1,
              }}
            >
              {t.label} <span style={{ color: T.ink3, fontWeight: 600 }}>({(count ?? 0).toLocaleString()})</span>
            </button>
          );
        })}
      </div>

      {/* 필터 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        <TextInput value={q} onChange={setQ} onEnter={() => load(1)} placeholder="이름·이메일·전화·업체명 검색" />
        <SelectInput value={type} onChange={setType} options={[
          { value: "all", label: "전체 유형" }, { value: "worker", label: "알바생" }, { value: "employer", label: "사장님" },
        ]} />
        <MiniBtn tone="primary" onClick={() => load(1)}>검색</MiniBtn>
      </div>

      {filterActive && (
        <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12 }}>
          현재 조건 결과 <strong style={{ color: T.coral }}>{(data.total ?? 0).toLocaleString()}</strong>명
        </div>
      )}

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
                { header: tab === "deactivated" ? "탈퇴일" : "가입", cell: (r) => fmtDateTime(tab === "deactivated" ? r.deactivated_at : r.created_at) },
                { header: "관리", cell: (r) => {
                    const btns = [];
                    if (r.user_type === "employer") {
                      btns.push(r.verified
                        ? <MiniBtn key="v" onClick={() => act(r.id, "unverify")}>인증해제</MiniBtn>
                        : <MiniBtn key="v" tone="success" onClick={() => act(r.id, "verify")}>인증</MiniBtn>);
                    }
                    if (r.deactivated_at) {
                      btns.push(<MiniBtn key="a" tone="success" onClick={() => act(r.id, "reactivate")}>활성화</MiniBtn>);
                    }
                    return btns.length ? <div style={{ display: "flex", gap: 6 }}>{btns}</div> : <span style={{ color: T.ink3 }}>-</span>;
                  } },
              ]}
              rows={data.rows}
              empty={tab === "deactivated" ? "탈퇴(비활성) 회원이 없습니다." : "조건에 맞는 회원이 없습니다."}
            />
            <Pager page={data.page} total={data.total} limit={data.limit} onPage={(p) => load(p)} />
          </>
        )}
      </Panel>
    </div>
  );
}
