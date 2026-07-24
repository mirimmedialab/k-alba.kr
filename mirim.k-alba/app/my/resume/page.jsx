"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser, getMyContracts } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { PageLoading, Button } from "@/components/ui";

/**
 * /my/resume — 알바생 이력서 (업로드 자동 생성 + 편집)
 *
 * 흐름:
 *   1) PDF/DOCX/TXT 업로드 → /api/resume/parse → 초안 자동 채움
 *   2) 사용자가 확인·수정 → worker_resumes upsert (RLS: 본인 + 지원받은 사장님 열람)
 *   3) K-ALBA 검증 근무이력(양측 서명 계약)은 자동 첨부 표시
 *
 * 개인정보:
 *   - 업로드 원본 파일은 서버에 저장하지 않음 (텍스트 추출 후 폐기)
 *   - 파싱 결과도 사용자가 '저장'을 눌러야만 DB에 기록됨
 */

const EMPTY = { intro: "", skills: [], languages: [], experiences: [], education: [], certificates: [] };

export default function MyResumePage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(EMPTY);
  const [verified, setVerified] = useState([]); // K-ALBA 계약 이력
  const [parsing, setParsing] = useState(false);
  const [parsedMsg, setParsedMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      const { data } = await supabase.from("worker_resumes").select("*").eq("user_id", u.id).maybeSingle();
      if (data) {
        setResume({
          intro: data.intro || "",
          skills: data.skills || [],
          languages: data.languages || [],
          experiences: data.experiences || [],
          education: data.education || [],
          certificates: data.certificates || [],
        });
      }
      const contracts = await getMyContracts(u.id, "worker");
      setVerified((contracts || []).filter((c) => c.worker_signed && c.employer_signed));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || parsing) return;
    setParsing(true);
    setParsedMsg("");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        headers: { Authorization: `Bearer ${sess?.session?.access_token}` },
        body: fd,
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "parse failed");
      const dr = d.draft || {};
      // 기존 내용이 있으면 빈 필드만 채우고, 리스트는 합침(중복 방지 간단화: 새 항목 우선)
      setResume((prev) => ({
        intro: dr.intro || prev.intro,
        skills: dr.skills?.length ? dr.skills : prev.skills,
        languages: dr.languages?.length ? dr.languages : prev.languages,
        experiences: dr.experiences?.length ? dr.experiences : prev.experiences,
        education: dr.education?.length ? dr.education : prev.education,
        certificates: dr.certificates?.length ? dr.certificates : prev.certificates,
      }));
      setParsedMsg(t("resume.parsed"));
    } catch (err) {
      alert(err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("worker_resumes").upsert({
        user_id: user.id,
        intro: resume.intro || null,
        skills: resume.skills,
        languages: resume.languages,
        experiences: resume.experiences,
        education: resume.education,
        certificates: resume.certificates,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      alert(t("resume.saved"));
    } catch (err) {
      alert("저장 실패: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // 리스트 항목 조작 헬퍼
  const setListItem = (key, idx, field, value) =>
    setResume((r) => ({ ...r, [key]: r[key].map((it, i) => (i === idx ? { ...it, [field]: value } : it)) }));
  const addListItem = (key, empty) => setResume((r) => ({ ...r, [key]: [...r[key], empty] }));
  const rmListItem = (key, idx) => setResume((r) => ({ ...r, [key]: r[key].filter((_, i) => i !== idx) }));

  if (loading) return <PageLoading />;

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/my" style={{ color: T.ink3, fontSize: 13, fontWeight: 600 }}>← {t("common.back")}</Link>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: "14px 0 4px" }}>📄 {t("resume.title")}</h1>
      <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 18px" }}>{t("resume.subtitle")}</p>

      {/* 업로드 카드 */}
      <div style={{ background: T.cream, borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          style={{
            width: "100%", padding: "13px 0", borderRadius: 8, border: `1.5px dashed ${T.coral}`,
            background: T.paper, color: T.coral, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {parsing ? `⏳ ${t("resume.parsing")}` : `📎 ${t("resume.upload")}`}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" style={{ display: "none" }} onChange={handleFile} />
        {parsedMsg && <div style={{ marginTop: 10, fontSize: 12.5, color: T.green, fontWeight: 700 }}>✅ {parsedMsg}</div>}
        <div style={{ marginTop: 8, fontSize: 11.5, color: T.ink3 }}>🔒 {t("resume.employerView")}</div>
      </div>

      {/* 자기소개 */}
      <Section title={t("resume.intro")}>
        <textarea
          value={resume.intro}
          onChange={(e) => setResume((r) => ({ ...r, intro: e.target.value }))}
          placeholder={t("resume.introPh")}
          rows={3}
          style={inputStyle({ width: "100%", resize: "vertical", lineHeight: 1.6 })}
        />
      </Section>

      {/* 경력 */}
      <Section title={t("resume.exp")} onAdd={() => addListItem("experiences", { place: "", role: "", period: "", description: "" })} addLabel={t("resume.add")}>
        {resume.experiences.map((ex, i) => (
          <ItemCard key={i} onRemove={() => rmListItem("experiences", i)} removeLabel={t("resume.remove")}>
            <Row>
              <Field label={t("resume.expPlace")} value={ex.place} onChange={(v) => setListItem("experiences", i, "place", v)} flex={2} />
              <Field label={t("resume.expPeriod")} value={ex.period} onChange={(v) => setListItem("experiences", i, "period", v)} flex={1.4} ph="2024.03 ~ 2025.06" />
            </Row>
            <Row>
              <Field label={t("resume.expRole")} value={ex.role} onChange={(v) => setListItem("experiences", i, "role", v)} flex={1} />
            </Row>
            <Field label={t("resume.expDesc")} value={ex.description} onChange={(v) => setListItem("experiences", i, "description", v)} />
          </ItemCard>
        ))}
      </Section>

      {/* 학력 */}
      <Section title={t("resume.edu")} onAdd={() => addListItem("education", { school: "", major: "", period: "", status: "" })} addLabel={t("resume.add")}>
        {resume.education.map((ed, i) => (
          <ItemCard key={i} onRemove={() => rmListItem("education", i)} removeLabel={t("resume.remove")}>
            <Row>
              <Field label={t("resume.eduSchool")} value={ed.school} onChange={(v) => setListItem("education", i, "school", v)} flex={2} />
              <Field label={t("resume.eduMajor")} value={ed.major} onChange={(v) => setListItem("education", i, "major", v)} flex={1.3} />
            </Row>
            <Row>
              <Field label={t("resume.eduPeriod")} value={ed.period} onChange={(v) => setListItem("education", i, "period", v)} flex={1.5} />
              <Field label={t("resume.eduStatus")} value={ed.status} onChange={(v) => setListItem("education", i, "status", v)} flex={1} ph="재학 / 졸업" />
            </Row>
          </ItemCard>
        ))}
      </Section>

      {/* 언어 */}
      <Section title={t("resume.langs")} onAdd={() => addListItem("languages", { lang: "", level: "" })} addLabel={t("resume.add")}>
        {resume.languages.map((lg, i) => (
          <ItemCard key={i} onRemove={() => rmListItem("languages", i)} removeLabel={t("resume.remove")}>
            <Row>
              <Field label={t("resume.langName")} value={lg.lang} onChange={(v) => setListItem("languages", i, "lang", v)} flex={1} />
              <Field label={t("resume.langLevel")} value={lg.level} onChange={(v) => setListItem("languages", i, "level", v)} flex={1} ph="TOPIK 4 / 중급" />
            </Row>
          </ItemCard>
        ))}
      </Section>

      {/* 기술 / 자격증 */}
      <Section title={t("resume.skills")}>
        <input
          value={resume.skills.join(", ")}
          onChange={(e) => setResume((r) => ({ ...r, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
          style={inputStyle({ width: "100%" })}
          placeholder="포스 사용, 바리스타, 엑셀"
        />
      </Section>
      <Section title={t("resume.certs")}>
        <input
          value={resume.certificates.join(", ")}
          onChange={(e) => setResume((r) => ({ ...r, certificates: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
          style={inputStyle({ width: "100%" })}
          placeholder="바리스타 2급"
        />
      </Section>

      <Button variant="primary" size="lg" onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 6 }}>
        {saving ? "..." : `💾 ${t("resume.save")}`}
      </Button>

      {/* K-ALBA 검증 이력 */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4 }}>✅ {t("resume.verified")}</div>
        <div style={{ fontSize: 12, color: T.ink3, marginBottom: 12 }}>{t("resume.verifiedDesc")}</div>
        {verified.length === 0 ? (
          <div style={{ background: T.cream, borderRadius: 10, padding: 16, fontSize: 13, color: T.ink2 }}>{t("resume.noVerified")}</div>
        ) : (
          verified.map((c) => (
            <div key={c.id} style={{ background: "#F0FAF4", border: "1px solid #CBEBD6", borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  {c.workplace_name || c.employer?.company_name || c.job?.title || "-"}
                </div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>
                  {(c.contract_start || "").slice(0, 10)} ~ {(c.contract_end || "").slice(0, 10)}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#0E7A3D", background: "#DDF3E4", borderRadius: 999, padding: "4px 10px", whiteSpace: "nowrap" }}>
                ✓ K-ALBA
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── 소품 컴포넌트 ──
function Section({ title, children, onAdd, addLabel }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{title}</div>
        {onAdd && (
          <button onClick={onAdd} style={{ border: "none", background: "transparent", color: T.coral, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ItemCard({ children, onRemove, removeLabel }) {
  return (
    <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 10, position: "relative" }}>
      {children}
      <button onClick={onRemove} style={{ position: "absolute", top: 8, right: 10, border: "none", background: "transparent", color: T.ink3, fontSize: 11.5, cursor: "pointer", fontFamily: "inherit" }}>
        ✕ {removeLabel}
      </button>
    </div>
  );
}

function Row({ children }) {
  return <div style={{ display: "flex", gap: 8 }}>{children}</div>;
}

function Field({ label, value, onChange, flex = 1, ph = "" }) {
  return (
    <label style={{ flex, display: "block", marginBottom: 8 }}>
      <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.ink3, marginBottom: 3 }}>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={ph} style={inputStyle({ width: "100%" })} />
    </label>
  );
}

const inputStyle = (extra = {}) => ({
  padding: "9px 11px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13.5,
  fontFamily: "inherit", color: T.ink, background: T.paper, boxSizing: "border-box", ...extra,
});
