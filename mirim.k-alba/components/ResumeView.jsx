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

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase.from("worker_resumes").select("*").eq("user_id", userId).maybeSingle();
      setResume(data || null);
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
            {resume.experiences?.length > 0 && (
              <Block title={t("resume.exp")}>
                {resume.experiences.map((ex, i) => (
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
            )}
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
