"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { PageLoading } from "@/components/ui";
import AssessmentReport from "@/components/AssessmentReport";

/**
 * /employer/training/[id] — 과정별 응시 결과 리포트 (사장님)
 *
 * 알바생별 직무/한국어 점수, 응시일. RLS: 과정 소유자만 결과 조회 가능.
 */
export default function TrainingResultsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [rows, setRows] = useState([]);
  const [reportFor, setReportFor] = useState(null); // 보고서 모달 대상 result row

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      const { data: c } = await supabase.from("training_courses").select("*").eq("id", id).maybeSingle();
      setCourse(c || null);
      if (c) {
        const { data: rs } = await supabase
          .from("training_results")
          .select("*, worker:profiles!training_results_worker_id_fkey(name, country, visa)")
          .eq("course_id", c.id)
          .order("completed_at", { ascending: false });
        setRows(rs || []);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <PageLoading />;
  if (!course) return <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>404</div>;

  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
  const avg = (key, tot) => {
    const vs = rows.filter((r) => r[tot] > 0);
    if (!vs.length) return null;
    return Math.round(vs.reduce((s, r) => s + (r[key] / r[tot]) * 100, 0) / vs.length);
  };

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 760, margin: "0 auto" }}>
      <Link href="/employer/training" style={{ color: T.ink3, fontSize: 13, fontWeight: 600 }}>← 교육 관리</Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: "12px 0 4px" }}>📊 {course.title}</h1>
      <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 18 }}>응시 {rows.length}명</div>

      {/* 요약 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="평균 직무 이해도" value={avg("job_score", "job_total")} color={T.coral} />
        <Stat label="평균 한국어 점수" value={avg("korean_score", "korean_total")} color="#1A56DB" />
      </div>

      {rows.length === 0 ? (
        <div style={{ background: T.cream, borderRadius: 12, padding: 20, fontSize: 13.5, color: T.ink2 }}>
          아직 응시한 알바생이 없습니다. 지원자·계약 알바생의 교육 메뉴에 자동으로 표시되고 있어요.
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: "13px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{r.worker?.name || "-"}</div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>
                  {r.worker?.country || "-"} · {r.worker?.visa || "-"} · {(r.completed_at || "").slice(0, 10)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {r.korean_total > 0 && (
                  <ScoreChip label="한국어" score={r.korean_score} total={r.korean_total} pct={pct(r.korean_score, r.korean_total)} color="#1A56DB" bg="#E8F0FE" />
                )}
                {r.job_total > 0 && (
                  <ScoreChip label="직무" score={r.job_score} total={r.job_total} pct={pct(r.job_score, r.job_total)} color={T.coral} bg="#FFF1EC" />
                )}
                <button onClick={() => setReportFor(r)} style={{
                  padding: "8px 13px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${T.border}`, background: T.paper, color: T.ink2, whiteSpace: "nowrap",
                }}>
                  📋 보고서
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      {reportFor && (
        <AssessmentReport
          course={course}
          result={reportFor}
          workerName={reportFor.worker?.name}
          courseAvg={{ koreanPct: avg("korean_score", "korean_total"), jobPct: avg("job_score", "job_total") }}
          onClose={() => setReportFor(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, minWidth: 150, background: T.cream, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: value == null ? T.ink3 : color }}>{value == null ? "—" : `${value}%`}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.ink3, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ScoreChip({ label, score, total, pct, color, bg }) {
  return (
    <div style={{ textAlign: "center", background: bg, borderRadius: 10, padding: "7px 13px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{score}/{total} <span style={{ fontSize: 11 }}>({pct}%)</span></div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.ink3 }}>{label}</div>
    </div>
  );
}
