"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

/**
 * ResumeView — 지원자 이력서 열람 모달 (사장님용)
 *
 * RLS: worker_resumes는 본인 + '자신의 공고에 지원한 알바생'의 사장님만 select 가능.
 * Props: userId(알바생), name, onClose
 */
export default function ResumeView({ userId, name, onClose }) {
  const t = useT();
  const [resume, setResume] = useState(undefined); // undefined: 로딩, null: 없음
  const [history, setHistory] = useState([]); // K-ALBA 검증 이력 + 사장님 평가
  const [training, setTraining] = useState([]); // 온보딩 교육 응시 결과 (내 과정)

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("worker_resumes").select("*").eq("user_id", userId).maybeSingle();
      setResume(data || null);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch(`/api/resume/history?worker_id=${userId}`, { headers: { Authorization: `Bearer ${sess?.session?.access_token}` } });
        const d = await res.json();
        if (d.ok) setHistory(d.history || []);
      } catch (_) {}
      try {
        const { data: trs } = await supabase
          .from("training_results")
          .select("id, job_score, job_total, korean_score, korean_total, completed_at, course:training_courses(title, owner_id)")
          .eq("worker_id", userId);
        setTraining((trs || []).filter((r) => r.course)); // RLS로 열람 가능한(내 소유) 과정만
      } catch (_) {}
    })();
  }, [userId]);

  if (!userId) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 560, width: "100%", maxHeight: "88vh", overflow: "auto", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>📄 {name} — {t("resume.title")}</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: T.ink3 }}>✕</button>
        </div>

        {resume === undefined ? (
          <div style={{ padding: 30, textAlign: "center", color: T.ink3, fontSize: 13 }}>...</div>
        ) : resume === null ? (
          <div style={{ background: T.cream, borderRadius: 10, padding: 18, fontSize: 13.5, color: T.ink2 }}>{t("resume.none")}</div>
        ) : (
          <>
            {resume.intro && (
              <Block title={t("resume.intro")}>
                <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.7 }}>{resume.intro}</div>
              </Block>
            )}
            {[
              { region: "korea", label: t("resume.expKorea") },
              { region: "home", label: t("resume.expHome") },
            ].map(({ region, label }) => {
              const items = (resume.experiences || []).filter((ex) => (ex.region || "korea") === region);
              if (!items.length) return null;
              return (
                <Block key={region} title={label}>
                  {items.map((ex, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: T.cream, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: T.ink }}>{ex.place}</span>
                        <span style={{ fontSize: 12, color: T.ink3 }}>{ex.period}</span>
                      </div>
                      {ex.role && <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 2 }}>{ex.role}</div>}
                      {ex.description && <div style={{ fontSize: 12, color: T.ink3, marginTop: 4, lineHeight: 1.6 }}>{ex.description}</div>}
                    </div>
                  ))}
                </Block>
              );
            })}
            {resume.education?.length > 0 && (
              <Block title={t("resume.edu")}>
                {resume.education.map((ed, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: T.ink, padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontWeight: 700 }}>{ed.school}{ed.major ? ` · ${ed.major}` : ""}</span>
                    <span style={{ color: T.ink3, fontSize: 12, whiteSpace: "nowrap" }}>{ed.period}{ed.status ? ` (${ed.status})` : ""}</span>
                  </div>
                ))}
              </Block>
            )}
            {resume.languages?.length > 0 && (
              <Block title={t("resume.langs")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {resume.languages.map((lg, i) => (
                    <span key={i} style={chip}>{lg.lang}{lg.level ? ` · ${lg.level}` : ""}</span>
                  ))}
                </div>
              </Block>
            )}
            {resume.skills?.length > 0 && (
              <Block title={t("resume.skills")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {resume.skills.map((s, i) => <span key={i} style={chip}>{s}</span>)}
                </div>
              </Block>
            )}
            {resume.certificates?.length > 0 && (
              <Block title={t("resume.certs")}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {resume.certificates.map((s, i) => <span key={i} style={chip}>{s}</span>)}
                </div>
              </Block>
            )}
          </>
        )}

        {/* 온보딩 교육 응시 결과 (내가 만든 과정) */}
        {training.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink3, marginBottom: 6, letterSpacing: "0.02em" }}>🎓 {t("training.title")}</div>
            {training.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, background: T.cream, borderRadius: 8, padding: "9px 12px", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{r.course.title}</div>
                <div style={{ display: "flex", gap: 6, whiteSpace: "nowrap" }}>
                  {r.job_total > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: T.coral, background: "#FFF1EC", borderRadius: 999, padding: "3px 9px" }}>
                      직무 {r.job_score}/{r.job_total}
                    </span>
                  )}
                  {r.korean_total > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#1A56DB", background: "#E8F0FE", borderRadius: 999, padding: "3px 9px" }}>
                      한국어 {r.korean_score}/{r.korean_total}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* K-ALBA 검증 근무 이력 + 사장님 평가 (이력서 미등록이어도 표시) */}
        {history.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink3, marginBottom: 6, letterSpacing: "0.02em" }}>✅ {t("resume.verified")}</div>
            {history.map((c) => (
              <div key={c.id} style={{ background: "#F0FAF4", border: "1px solid #CBEBD6", borderRadius: 10, padding: "11px 13px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>{c.workplace}</div>
                    <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{c.start} ~ {c.end}{c.job ? ` · ${c.job}` : ""}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#0E7A3D", background: "#DDF3E4", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>✓ K-ALBA</span>
                </div>
                {c.review && (
                  <div style={{ marginTop: 8, background: "#FFFFFF", borderRadius: 8, padding: "8px 11px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: T.ink3 }}>
                      💬 {t("resume.employerComment")} <span style={{ color: "#E8A100" }}>{"★".repeat(c.review.rating)}{"☆".repeat(5 - c.review.rating)}</span>
                    </div>
                    {c.review.comment && <div style={{ fontSize: 12.5, color: T.ink, marginTop: 3, lineHeight: 1.6 }}>{c.review.comment}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: T.ink3, marginBottom: 6, letterSpacing: "0.02em" }}>{title}</div>
      {children}
    </div>
  );
}

const chip = {
  fontSize: 12, fontWeight: 700, color: T.ink2, background: "#F4F6FB",
  border: "1px solid #E3E8F2", borderRadius: 999, padding: "4px 11px",
};
