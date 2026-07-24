"use client";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { computeBreakdown, partScore, strengthsAndWeaknesses, TYPE_ORDER } from "@/lib/reportUtils";

/**
 * AssessmentReport — 다각도 평가 보고서 (사장님·알바생 공용 모달)
 *
 * Props:
 *   course: { title, questions }
 *   result: { answers, job_score, job_total, korean_score, korean_total, completed_at }
 *   workerName?: 표시용 이름
 *   courseAvg?: { koreanPct, jobPct } — 과정 평균 (사장님 리포트에서 전달, 없으면 미표시)
 *   onClose
 */
export default function AssessmentReport({ course, result, workerName, courseAvg, onClose }) {
  const t = useT();
  if (!course || !result) return null;

  const bd = computeBreakdown(course.questions || [], result.answers || []);
  const ko = partScore(bd, "korean");
  const job = partScore(bd, "job");
  const { strengths, weaknesses } = strengthsAndWeaknesses(bd);
  const typeLabel = (type) => t(`report.t_${type}`);

  const Bar = ({ label, correct, total, color }) => {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <div style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 3 }}>
          <span>{label}</span>
          <span>{correct}/{total} ({pct}%)</span>
        </div>
        <div style={{ height: 8, background: "#EEF1F6", borderRadius: 999 }}>
          <div style={{ width: `${pct}%`, height: 8, background: color, borderRadius: 999, transition: "width .3s" }} />
        </div>
      </div>
    );
  };

  const Part = ({ partKey, title, score, color, avgPct }) => {
    if (score.total === 0) return null;
    const types = TYPE_ORDER[partKey].filter((ty) => bd[partKey][ty]);
    return (
      <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color }}>
            {score.pct}%
            {avgPct != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: T.ink3, marginLeft: 8 }}>
                {t("report.avg")} {avgPct}%
              </span>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: T.ink3, marginBottom: 7 }}>{t("report.byType")}</div>
        {types.map((ty) => (
          <Bar key={ty} label={typeLabel(ty)} correct={bd[partKey][ty].correct} total={bd[partKey][ty].total} color={color} />
        ))}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F7F8FB", borderRadius: 14, maxWidth: 540, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>📋 {t("report.title")}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: T.ink3 }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 14 }}>
          {workerName ? `${workerName} · ` : ""}{course.title} · {t("report.date")}: {(result.completed_at || "").slice(0, 10)}
        </div>

        <Part partKey="korean" title={t("report.korean")} score={ko} color="#1A56DB" avgPct={courseAvg?.koreanPct} />
        <Part partKey="job" title={t("report.job")} score={job} color="#E8542F" avgPct={courseAvg?.jobPct} />

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {strengths.length > 0 && (
              <div style={{ flex: 1, minWidth: 200, background: "#F0FAF4", border: "1px solid #CBEBD6", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0E7A3D", marginBottom: 7 }}>💪 {t("report.strengths")}</div>
                {strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: T.ink, marginBottom: 4 }}>
                    {typeLabel(s.type)} <b>{s.pct}%</b> — {t("report.comment_good")}
                  </div>
                ))}
              </div>
            )}
            {weaknesses.length > 0 && (
              <div style={{ flex: 1, minWidth: 200, background: "#FDF1F0", border: "1px solid #F5D5D2", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#8C1D18", marginBottom: 7 }}>📌 {t("report.weaknesses")}</div>
                {weaknesses.map((s, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: T.ink, marginBottom: 4 }}>
                    {typeLabel(s.type)} <b>{s.pct}%</b> — {t("report.comment_weak")}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
