"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { Panel } from "../_ui";
import { QUESTION_BANKS } from "@/lib/trainingTemplates";
import { parseSubtitleText } from "@/lib/srt";
import { generateQuizFromSections, generateKoreanQuizFromSections } from "@/lib/quizGen";

/**
 * /admin/training — 본사(브랜드) 공통 교육 관리
 *
 * - 브랜드명 기준으로 같은 상호의 모든 가맹점(사장님)·그 지원자/알바생에게 동일 교육 노출
 * - 평가 문항 확인·수정, 전 언어(en/vi/zh-CN/ja) 번역 사전 생성
 * - 인증: 어드민 쿠키 (API /api/admin/training)
 */

const EMPTY = {
  brand_name: "", title: "", description: "", open_to_applicants: true, is_active: true,
  sections: [{ title: "", body: "", video_url: "" }],
  questions: [{ q: "", choices: ["", "", "", ""], answer: 0, kind: "job" }],
};

const LANG_LABEL = { en: "영어", vi: "베트남어", "zh-CN": "중국어", ja: "일본어" };
// 번역/자막 업로드 대상 언어 (K-ALBA locale 코드)
const UPLOAD_LANGS = [
  ["ko", "한국어 스크립트(자동출제용)"], ["en", "영어"], ["vi", "베트남어"], ["zh", "중국어"], ["ja", "일본어"], ["uz", "우즈베크어"], ["mn", "몽골어"],
];

export default function AdminTrainingPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [papago, setPapago] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(0); // course id being translated

  const load = async () => {
    const res = await fetch("/api/admin/training", { cache: "no-store" });
    const d = await res.json();
    if (d.ok) { setCourses(d.courses); setPapago(d.papago); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing.brand_name.trim()) { alert("브랜드명을 입력해 주세요. (예: 메가MGC커피 — 가맹점 상호와 부분일치로 매칭됩니다)"); return; }
    if (!editing.title.trim()) { alert("과정 제목을 입력해 주세요."); return; }
    setSaving(true);
    try {
      const cleanedQs = editing.questions.filter((q) => q.q.trim() && q.choices.filter((c) => c.trim()).length >= 2)
        .map((q) => ({ ...q, q: q.q.trim(), choices: q.choices.map((c) => c.trim()).filter(Boolean) }));
      const cleanedSecs = editing.sections.filter((s) => s.title.trim() || s.body.trim() || s.video_url.trim() || Object.keys(s.i18n || {}).length);
      // 직무 문항 자동 충원: 10개 미만이면 매뉴얼·영상 스크립트에서 자동 출제해 10~15문항으로 맞춤
      let autoAdded = 0;
      {
        const jobCount = cleanedQs.filter((q) => q.kind !== "korean").length;
        if (jobCount < 10) {
          const existing = new Set(cleanedQs.map((q) => q.q));
          const gen = generateQuizFromSections(cleanedSecs, { min: 10, max: 15 });
          for (const g of gen) {
            if (cleanedQs.filter((q) => q.kind !== "korean").length >= 15) break;
            if (existing.has(g.q)) continue;
            cleanedQs.push(g);
            existing.add(g.q);
            autoAdded++;
          }
        }
      }
      const body = {
        ...editing,
        sections: cleanedSecs,
        questions: cleanedQs,
      };
      const res = await fetch("/api/admin/training", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);
      setEditing(null);
      await load();
      if (autoAdded > 0) alert(`저장되었습니다. 직무 평가 문항 ${autoAdded}개가 매뉴얼·영상 내용에서 자동 출제되어 추가되었습니다.`);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTranslate = async (id) => {
    if (translating) return;
    setTranslating(id);
    try {
      const res = await fetch(`/api/admin/training?action=translate&id=${id}`, { method: "POST" });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error === "translation_unconfigured" ? "파파고 API 키가 설정되지 않았습니다 (NCP_PAPAGO_KEY_ID / NCP_PAPAGO_KEY)" : d.error);
      alert(`번역 완료: ${d.translated.map((l) => LANG_LABEL[l] || l).join(", ")}`);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setTranslating(0);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("이 과정을 삭제할까요? 응시 결과도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/admin/training?id=${id}`, { method: "DELETE" });
    const d = await res.json();
    if (!d.ok) { alert(d.error); return; }
    await load();
  };

  if (loading) return <div style={{ padding: 40, color: T.ink3 }}>불러오는 중…</div>;

  // ── 빌더 ──
  if (editing) {
    const set = (patch) => setEditing((e) => ({ ...e, ...patch }));
    const setSec = (i, f, v) => set({ sections: editing.sections.map((s, j) => (j === i ? { ...s, [f]: v } : s)) });
    const setQ = (i, patch) => set({ questions: editing.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
    return (
      <div style={{ maxWidth: 860 }}>
        <button onClick={() => setEditing(null)} style={linkBtn}>← 목록으로</button>
        <h1 style={h1}>{editing.id ? "✏️ 본사 교육 수정" : "➕ 본사 공통 교육 만들기"}</h1>

        <div style={{ display: "flex", gap: 12 }}>
          <L label="브랜드명 * (가맹점 상호와 부분일치 매칭)" flex={1}>
            <input value={editing.brand_name} onChange={(e) => set({ brand_name: e.target.value })} style={inp({ width: "100%" })} placeholder="예: 메가MGC커피" />
          </L>
          <L label="과정 제목 *" flex={1.6}>
            <input value={editing.title} onChange={(e) => set({ title: e.target.value })} style={inp({ width: "100%" })} placeholder="예: 신입 크루 기본 교육" />
          </L>
        </div>
        <L label="소개"><textarea value={editing.description || ""} onChange={(e) => set({ description: e.target.value })} rows={2} style={inp({ width: "100%", resize: "vertical" })} /></L>
        <div style={{ display: "flex", gap: 16, margin: "4px 0 16px" }}>
          <label style={chk}><input type="checkbox" checked={editing.open_to_applicants} onChange={(e) => set({ open_to_applicants: e.target.checked })} /> 지원자에게도 공개 (면접 전 서면평가)</label>
          <label style={chk}><input type="checkbox" checked={editing.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> 활성화</label>
        </div>

        <SecHead title="📖 학습 내용 (매뉴얼·영상)" onAdd={() => set({ sections: [...editing.sections, { title: "", body: "", video_url: "" }] })} />
        {editing.sections.map((s, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={s.title} onChange={(e) => setSec(i, "title", e.target.value)} style={inp({ flex: 1 })} placeholder={`섹션 ${i + 1} 제목`} />
              <button onClick={() => set({ sections: editing.sections.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
            </div>
            <input value={s.video_url} onChange={(e) => setSec(i, "video_url", e.target.value)} style={inp({ width: "100%", marginTop: 8 })} placeholder="교육 영상 URL (유튜브 — 선택)" />
            <textarea value={s.body} onChange={(e) => setSec(i, "body", e.target.value)} rows={4} style={inp({ width: "100%", marginTop: 8, resize: "vertical", lineHeight: 1.6 })} placeholder="매뉴얼 본문" />

            {/* 언어별 번역/자막 업로드 (SRT·VTT·TXT) */}
            <div style={{ marginTop: 10, background: "#F8F5FF", borderRadius: 8, padding: "9px 11px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#7C3AED", marginBottom: 6 }}>
                🌐 번역·자막 파일 (SRT/VTT/TXT) — 언어 선택 후 업로드하면 해당 언어 학습자에게 번역본으로 표시됩니다
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {UPLOAD_LANGS.map(([code, label]) => {
                  const has = !!(s.i18n && s.i18n[code]);
                  return (
                    <label key={code} style={{
                      display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999,
                      fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${has ? "#7C3AED" : T.border}`,
                      background: has ? "#EFE7FD" : T.paper, color: has ? "#7C3AED" : T.ink3,
                    }}>
                      {has ? "✓ " : "⬆ "}{label}
                      <input type="file" accept=".srt,.vtt,.txt" style={{ display: "none" }} onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        const text = parseSubtitleText(await f.text(), f.name);
                        if (!text) { alert("파일에서 텍스트를 찾지 못했습니다."); return; }
                        setSec(i, "i18n", { ...(s.i18n || {}), [code]: text });
                      }} />
                      {has && (
                        <span onClick={(ev) => {
                          ev.preventDefault();
                          const next = { ...(s.i18n || {}) };
                          delete next[code];
                          setSec(i, "i18n", next);
                        }} style={{ marginLeft: 2, fontWeight: 800 }}>✕</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ))}

        <SecHead title="📝 평가 문항 (객관식 · 직무/한국어 구분)" onAdd={() => set({ questions: [...editing.questions, { q: "", choices: ["", "", "", ""], answer: 0, kind: "job" }] })} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <button onClick={() => {
            const auto = generateQuizFromSections(editing.sections, { min: 10, max: 15 });
            if (!auto.length) { alert("매뉴얼 본문(또는 한국어 스크립트)이 부족해 자동 출제할 수 없습니다. 학습 내용을 먼저 채워주세요."); return; }
            const keep = editing.questions.filter((q) => q.q.trim() && !(q.auto && q.kind !== "korean"));
            set({ questions: [...keep, ...auto] });
            alert(`직무 문항 ${auto.length}개를 자동 출제했습니다. 내용을 검토·수정 후 저장하세요.`);
          }} style={{ ...pill, border: "1px solid #7C3AED", color: "#7C3AED", background: "#F8F5FF", fontWeight: 800 }}>
            🤖 매뉴얼·영상에서 자동 출제 (10~15문항)
          </button>
          <button onClick={() => {
            const auto = generateKoreanQuizFromSections(editing.sections, { max: 10 });
            if (!auto.length) { alert("매뉴얼에서 서비스 표현을 찾지 못했습니다. '어서오세요' 같은 인사·표현을 본문에 포함해 주세요."); return; }
            const keep = editing.questions.filter((q) => q.q.trim() && !(q.auto && q.kind === "korean"));
            set({ questions: [...keep, ...auto] });
            alert(`직무 한국어 문항 ${auto.length}개를 자동 출제했습니다. 내용을 검토·수정 후 저장하세요.`);
          }} style={{
            padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            border: "1px solid #1A56DB", background: "#EFF4FE", color: "#1A56DB",
          }}>
            🇰🇷 직무 한국어 자동 출제 (~10문항)
          </button>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.ink2 }}>📚 기본 문항:</span>
          {Object.entries(QUESTION_BANKS).map(([k, bank]) => (
            <button key={k} onClick={() => set({ questions: [...editing.questions.filter((q) => q.q.trim()), ...JSON.parse(JSON.stringify(bank.questions))] })} style={pill}>
              {bank.label}
            </button>
          ))}
        </div>
        {editing.questions.map((q, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={q.kind} onChange={(e) => setQ(i, { kind: e.target.value })} style={inp({ width: 110 })}>
                <option value="job">직무</option>
                <option value="korean">한국어</option>
              </select>
              <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} style={inp({ flex: 1 })} placeholder={`문제 ${i + 1}`} />
              <button onClick={() => set({ questions: editing.questions.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
            </div>
            {q.choices.map((c, ci) => (
              <div key={ci} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7 }}>
                <input type="radio" name={`ans-${i}`} checked={q.answer === ci} onChange={() => setQ(i, { answer: ci })} title="정답" />
                <input value={c} onChange={(e) => setQ(i, { choices: q.choices.map((cc, cj) => (cj === ci ? e.target.value : cc)) })} style={inp({ flex: 1 })} placeholder={`보기 ${ci + 1}`} />
              </div>
            ))}
          </div>
        ))}

        <button onClick={handleSave} disabled={saving} style={saveBtn}>{saving ? "저장 중…" : "💾 저장하기"}</button>
      </div>
    );
  }

  // ── 목록 ──
  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 style={h1}>🎓 본사 공통 교육</h1>
        <button onClick={() => setEditing(JSON.parse(JSON.stringify(EMPTY)))} style={saveBtn}>➕ 새 본사 교육</button>
      </div>
      <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 16px", lineHeight: 1.7 }}>
        브랜드명이 상호에 포함된 <b>모든 가맹점</b>과 그 지원자·알바생에게 동일한 교육이 노출됩니다.
        각 점주는 자기 매장 지원자·알바생의 응시 결과만 볼 수 있습니다.
      </p>

      <Panel>
        {courses.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13.5, color: T.ink2 }}>등록된 본사 교육이 없습니다.</div>
        ) : (
          courses.map((c) => (
            <div key={c.id} style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#7C3AED", background: "#F3EEFE", borderRadius: 999, padding: "2px 9px", marginRight: 8 }}>{c.brand_name}</span>
                    {c.title}
                    {!c.is_active && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#8C6D1F", background: "#FBF3D9", borderRadius: 999, padding: "2px 8px", marginLeft: 8 }}>비활성</span>}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 4 }}>
                    섹션 {(c.sections || []).length} · 문항 {(c.questions || []).length}
                    {" · "}응시 {c.result_count}명
                    {c.avg && c.avg.jobT > 0 && <> · 평균 직무 {Math.round((c.avg.job / c.avg.jobT) * 100)}%</>}
                    {c.avg && c.avg.koT > 0 && <> · 평균 한국어 {Math.round((c.avg.ko / c.avg.koT) * 100)}%</>}
                    {" · 번역(자막): "}
                    {(() => {
                      const langs = new Set();
                      for (const s of c.sections || []) for (const k of Object.keys(s.i18n || {})) langs.add(k);
                      const arr = [...langs];
                      return arr.length ? arr.map((l) => (UPLOAD_LANGS.find(([k]) => k === l)?.[1] || l)).join("·") : "없음";
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => setEditing(JSON.parse(JSON.stringify(c)))} style={pill}>✏️ 수정·문항 확인</button>
                  <button onClick={() => handleDelete(c.id)} style={{ ...pill, color: "#B3261E" }}>삭제</button>
                </div>
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}

const h1 = { fontSize: 20, fontWeight: 800, color: T.ink, margin: "0 0 4px" };
function L({ label, children, flex }) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: T.ink2, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}
function SecHead({ title, onAdd }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 8px" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{title}</div>
      <button onClick={onAdd} style={{ ...linkBtn, color: T.coral }}>+ 추가</button>
    </div>
  );
}
const inp = (extra = {}) => ({
  padding: "9px 11px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13.5,
  fontFamily: "inherit", color: T.ink, background: T.paper, boxSizing: "border-box", ...extra,
});
const card = { background: T.paper, border: `1px solid ${T.border}`, borderRadius: 10, padding: 13, marginBottom: 10 };
const linkBtn = { border: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit", padding: 0 };
const xBtn = { border: "none", background: "transparent", color: T.ink3, fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
const chk = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: T.ink2, cursor: "pointer" };
const pill = { padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${T.border}`, background: T.paper, color: T.ink2 };
const saveBtn = { padding: "10px 18px", borderRadius: 8, fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", border: "none", background: T.ink, color: "#fff" };
