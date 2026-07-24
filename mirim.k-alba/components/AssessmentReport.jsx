"use client";
import { T } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { computeBreakdown, partScore, strengthsAndWeaknesses, TYPE_ORDER } from "@/lib/reportUtils";

/**
 * AssessmentReport — 다각도 평가 보고서 (사장님·알바생 공용 모달)
 *
 * 구성: 파트별 점수(+과정 평균) → 레이더 차트(유형 3개 이상 시) → 유형별 막대
 *      → 성장 추이(재응시 이력) → 강점/보완 → 오답 확인
 *
 * Props:
 *   course: { title, questions }
 *   result: { answers, attempts?, job_score, job_total, korean_score, korean_total, completed_at }
 *   workerName?
 *   courseAvg?: { koreanPct, jobPct }
 *   jobPctList?: number[] — 과정 응시자들의 직무 % 분포 (사장님: 상대 위치 표시)
 *   onClose
 */
export default function AssessmentReport({ course, result, workerName, courseAvg, jobPctList, onClose }) {
  const t = useT();
  if (!course || !result) return null;

  const questions = course.questions || [];
  const bd = computeBreakdown(questions, result.answers || []);
  const ko = partScore(bd, "korean");
  const job = partScore(bd, "job");
  const { strengths, weaknesses } = strengthsAndWeaknesses(bd);
  const typeLabel = (type) => t(`report.t_${type}`);

  // 상대 위치 (사장님 보고서): 직무 % 분포에서 상위 몇 %인지
  let rankPct = null;
  if (job.pct != null && Array.isArray(jobPctList) && jobPctList.length >= 3) {
    const higher = jobPctList.filter((p) => p > job.pct).length;
    rankPct = Math.max(1, Math.round(((higher + 1) / jobPctList.length) * 100));
  }

  // 성장 추이 (직무 기준, 이력 + 현재)
  const trend = [
    ...(result.attempts || []).map((a) => ({ pct: a.job_total ? Math.round((a.job_score / a.job_total) * 100) : null, date: (a.completed_at || "").slice(5, 10) })),
    { pct: job.total ? job.pct : null, date: (result.completed_at || "").slice(5, 10), current: true },
  ].filter((x) => x.pct != null);

  // 오답 목록 (파트별)
  const wrongs = questions
    .map((q, i) => ({ q, i, a: result.answers?.[i] }))
    .filter(({ q, a }) => a !== null && a !== undefined && a !== q.answer);

  const Bar = ({ label, correct, total, color }) => {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return (
      <div style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: T.ink2, marginBottom: 3 }}>
          <span>{label}</span>
          <span>{correct}/{total} ({pct}%)</span>
        </div>
        <div style={{ height: 8, background: "#EEF1F6", borderRadius: 999 }}>
          <div style={{ width: `${pct}%`, height: 8, background: color, borderRadius: 999 }} />
        </div>
      </div>
    );
  };

  // 레이더 차트 (SVG) — 유형 3개 이상일 때
  const Radar = ({ items, color }) => {
    const size = 210, cx = size / 2, cy = size / 2, R = 70;
    const n = items.length;
    const pt = (idx, r) => {
      const ang = (Math.PI * 2 * idx) / n - Math.PI / 2;
      return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
    };
    const poly = (rFn) => items.map((_, i) => pt(i, rFn(i)).join(",")).join(" ");
    return (
      <svg width={size} height={size} style={{ display: "block", margin: "0 auto 6px" }}>
        {[0.33, 0.66, 1].map((f) => (
          <polygon key={f} points={poly(() => R * f)} fill="none" stroke="#E3E8F2" strokeWidth="1" />
        ))}
        {items.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E3E8F2" strokeWidth="1" />;
        })}
        <polygon points={poly((i) => R * (items[i].pct / 100))} fill={color + "33"} stroke={color} strokeWidth="2" />
        {items.map((it, i) => {
          const [x, y] = pt(i, R * (it.pct / 100));
          return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
        })}
        {items.map((it, i) => {
          const [x, y] = pt(i, R + 24);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#5A6478">
              <tspan x={x} dy="-2">{it.label}</tspan>
              <tspan x={x} dy="12" fontWeight="800" fill={color}>{it.pct}%</tspan>
            </text>
          );
        })}
      </svg>
    );
  };

  const Part = ({ partKey, title, score, color, avgPct, extraChip }) => {
    if (score.total === 0) return null;
    const types = TYPE_ORDER[partKey].filter((ty) => bd[partKey][ty]);
    const radarItems = types
      .filter((ty) => bd[partKey][ty].total > 0)
      .map((ty) => ({ label: typeLabel(ty), pct: Math.round((bd[partKey][ty].correct / bd[partKey][ty].total) * 100) }));
    return (
      <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{title}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color, display: "flex", alignItems: "baseline", gap: 8 }}>
            {score.pct}%
            {avgPct != null && <span style={{ fontSize: 11, fontWeight: 700, color: T.ink3 }}>{t("report.avg")} {avgPct}%</span>}
            {extraChip}
          </div>
        </div>
        {radarItems.length >= 3 && <Radar items={radarItems} color={color === T.coral ? "#E8542F" : color} />}
        <div style={{ fontSize: 11.5, fontWeight: 800, color: T.ink3, margin: "4px 0 7px" }}>{t("report.byType")}</div>
        {types.map((ty) => (
          <Bar key={ty} label={typeLabel(ty)} correct={bd[partKey][ty].correct} total={bd[partKey][ty].total} color={color} />
        ))}
      </div>
    );
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#F7F8FB", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>📋 {t("report.title")}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: T.ink3 }}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 14 }}>
          {workerName ? `${workerName} · ` : ""}{course.title} · {t("report.date")}: {(result.completed_at || "").slice(0, 10)}
        </div>

        <Part partKey="korean" title={t("report.korean")} score={ko} color="#1A56DB" avgPct={courseAvg?.koreanPct} />
        <Part
          partKey="job"
          title={t("report.job")}
          score={job}
          color={T.coral}
          avgPct={courseAvg?.jobPct}
          extraChip={rankPct != null && (
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#7C3AED", background: "#EFE7FD", borderRadius: 999, padding: "3px 9px" }}>
              🏅 {t("report.rank", { n: rankPct })}
            </span>
          )}
        />

        {/* 성장 추이 (재응시 2회 이상) */}
        {trend.length >= 2 && (
          <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink3, marginBottom: 10 }}>📈 {t("report.trend")} — {t("report.job")}</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              {trend.map((a, i) => (
                <div key={i} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{
                    height: Math.max(14, a.pct * 0.7), background: a.current ? T.coral : "#F3C4B5",
                    borderRadius: "6px 6px 0 0", display: "flex", alignItems: "flex-start", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginTop: 2 }}>{a.pct}%</span>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, marginTop: 4 }}>
                    {t("report.attempt", { n: i + 1 })} · {a.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
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

        {/* 오답 확인 */}
        {wrongs.length > 0 && (
          <details style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px" }}>
            <summary style={{ fontSize: 13, fontWeight: 800, color: T.ink, cursor: "pointer" }}>
              ❌ {t("report.wrong")} ({wrongs.length})
            </summary>
            <div style={{ marginTop: 10 }}>
              {wrongs.map(({ q, i, a }) => (
                <div key={i} style={{ background: "#FBFBFD", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, lineHeight: 1.6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 7px", marginRight: 6,
                      background: q.kind === "korean" ? "#E8F0FE" : "#FFF1EC",
                      color: q.kind === "korean" ? "#1A56DB" : T.coral,
                    }}>
                      {q.kind === "korean" ? t("training.kindKorean") : t("training.kindJob")}
                    </span>
                    {q.q}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 5, color: "#B3261E" }}>✗ {t("report.myAnswer")}: {q.choices?.[a]}</div>
                  <div style={{ fontSize: 12, marginTop: 2, color: "#0E7A3D", fontWeight: 700 }}>✓ {t("report.correct")}: {q.choices?.[q.answer]}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
