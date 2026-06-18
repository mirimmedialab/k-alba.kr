"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { adminGet } from "@/lib/adminApi";
import { Panel, Stat, fmtDateTime } from "./_ui";

/**
 * /admin — 관리자 대시보드
 * 인증은 상위 layout.jsx(role=admin 게이트)에서 처리.
 */
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    adminGet("/api/admin/stats").then(setData).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: 0 }}>대시보드</h1>
        <p style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>K-ALBA 운영 지표 한눈에 보기</p>
      </header>

      {err && (
        <div style={{ padding: 14, background: T.errorBg, color: T.error, borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          데이터를 불러오지 못했습니다: {err}
        </div>
      )}

      {!data && !err && <div style={{ color: T.ink3 }}>불러오는 중…</div>}

      {data && (
        <>
          {/* 회원 지표 */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
            <Stat label="전체 회원" value={data.users.total.toLocaleString()} sub={`최근 7일 +${data.users.new7d}`} accent={T.navy} />
            <Stat label="알바생" value={data.users.workers.toLocaleString()} accent={T.coral} />
            <Stat label="사장님" value={data.users.employers.toLocaleString()} accent={T.gold} />
            <Stat label="탈퇴(비활성)" value={data.users.deactivated.toLocaleString()} accent={T.ink3} />
          </div>

          {/* 서비스 지표 */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
            <Stat label="전체 공고" value={data.jobs.total.toLocaleString()} sub={`활성 ${data.jobs.active.toLocaleString()}건`} accent={T.navy} />
            <Stat label="지원 내역" value={data.applications.toLocaleString()} accent={T.coral} />
            <Stat label="근로계약서" value={data.contracts.toLocaleString()} accent={T.mint} />
            <Stat label="시간제취업 신청" value={data.partwork.toLocaleString()} accent={T.gold} />
          </div>

          {/* 처리 대기 알림 */}
          {data.pendingStaff > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              <Link href="/admin/monitoring?tab=staff" style={{ textDecoration: "none" }}>
                <div style={{ padding: "12px 16px", background: T.warningBg, color: "#92600A", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
                  ⚠ 학교 담당자 승인 대기 {data.pendingStaff}건
                </div>
              </Link>
            </div>
          )}

          {/* 데이터 동기화 요약 (소스별 최신 결과) */}
          <Panel
            title="데이터 동기화"
            right={<Link href="/admin/sync" style={{ fontSize: 13, color: T.coral, fontWeight: 700 }}>전체 보기 →</Link>}
          >
            {(!data.syncSummary || data.syncSummary.length === 0) ? (
              <div style={{ padding: "28px 18px", textAlign: "center", color: T.ink3 }}>동기화 기록이 없습니다.</div>
            ) : (
              data.syncSummary.map((s, i) => {
                const label = s.source === "cleanup" ? "갱신 · 만료 공고 정리" : `수집 · ${s.source}`;
                let chipBg, chipFg, chipText;
                if (s.status === "success") { chipBg = T.successBg; chipFg = "#0A8F6B"; chipText = "✓ 성공"; }
                else if (s.status === "failed" || s.status === "error") { chipBg = T.errorBg; chipFg = T.error; chipText = "✗ 실패"; }
                else if (s.stale) { chipBg = T.errorBg; chipFg = T.error; chipText = "⚠ 미완료"; }
                else { chipBg = T.infoBg; chipFg = T.info; chipText = "진행중"; }
                const metric = s.source === "cleanup" ? `정리 ${s.items_updated}건` : `신규 ${s.items_new}건`;
                return (
                  <div key={s.source} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{fmtDateTime(s.started_at)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: chipBg, color: chipFg }}>{chipText}</span>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>{metric}</div>
                    </div>
                  </div>
                );
              })
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
