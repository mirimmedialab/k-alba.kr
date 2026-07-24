"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { PageLoading, Button } from "@/components/ui";
import { QUESTION_BANKS } from "@/lib/trainingTemplates";

/**
 * /employer/training — 사장님 온보딩 교육 관리 (과정 목록 + 빌더 + 결과 요약)
 *
 * 과정 = 학습 섹션(제목/본문/영상URL) + 평가 문항(객관식, 직무/한국어 구분).
 * 알바생 노출 범위: 지원자(open_to_applicants=켬, 면접 전 서면평가용) + 계약 알바생.
 * 사장님 화면은 한국어 고정 (서비스 정책과 동일).
 */

const EMPTY_COURSE = {
  title: "", description: "", open_to_applicants: true, is_active: true,
  sections: [{ title: "", body: "", video_url: "" }],
  questions: [{ q: "", choices: ["", "", "", ""], answer: 0, kind: "job" }],
};

export default function EmployerTrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [brandCourses, setBrandCourses] = useState([]); // 본사 제공 (RLS: 내 상호와 매칭)
  const [resultCount, setResultCount] = useState({});
  const [editing, setEditing] = useState(null); // null | course object (id 없으면 신규)
  const [saving, setSaving] = useState(false);

  const load = async (uid) => {
    const { data: cs } = await supabase
      .from("training_courses").select("*").eq("owner_id", uid).order("created_at", { ascending: false });
    setCourses(cs || []);
    const { data: bcs } = await supabase
      .from("training_courses").select("id, brand_name, title, description, sections, questions")
      .not("brand_name", "is", null).order("created_at", { ascending: false });
    setBrandCourses(bcs || []);
    const ids = (cs || []).map((c) => c.id);
    if (ids.length) {
      const { data: rs } = await supabase.from("training_results").select("course_id").in("course_id", ids);
      const cnt = {};
      for (const r of rs || []) cnt[r.course_id] = (cnt[r.course_id] || 0) + 1;
      setResultCount(cnt);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      await load(u.id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!editing.title.trim()) { alert("과정 제목을 입력해 주세요."); return; }
    const qs = editing.questions.filter((q) => q.q.trim() && q.choices.filter((c) => c.trim()).length >= 2);
    const secs = editing.sections.filter((s) => s.title.trim() || s.body.trim() || s.video_url.trim());
    if (saving) return;
    setSaving(true);
    try {
      const row = {
        owner_id: user.id,
        title: editing.title.trim(),
        description: editing.description?.trim() || null,
        sections: secs.map((s) => ({ title: s.title.trim(), body: s.body.trim(), video_url: s.video_url.trim() })),
        questions: qs.map((q) => ({ q: q.q.trim(), choices: q.choices.map((c) => c.trim()).filter(Boolean), answer: q.answer, kind: q.kind })),
        open_to_applicants: !!editing.open_to_applicants,
        is_active: !!editing.is_active,
        updated_at: new Date().toISOString(),
      };
      const query = editing.id
        ? supabase.from("training_courses").update(row).eq("id", editing.id)
        : supabase.from("training_courses").insert(row);
      const { error } = await query;
      if (error) throw error;
      setEditing(null);
      await load(user.id);
      alert("저장되었습니다!");
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  // ── 빌더 화면 ──
  if (editing) {
    const set = (patch) => setEditing((e) => ({ ...e, ...patch }));
    const setSec = (i, field, v) => set({ sections: editing.sections.map((s, j) => (j === i ? { ...s, [field]: v } : s)) });
    const setQ = (i, patch) => set({ questions: editing.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
    return (
      <div style={{ padding: "24px 20px 80px", maxWidth: 760, margin: "0 auto" }}>
        <button onClick={() => setEditing(null)} style={linkBtn}>← 목록으로</button>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: "12px 0 16px" }}>
          {editing.id ? "✏️ 교육 과정 수정" : "➕ 새 교육 과정 만들기"}
        </h1>

        <L label="과정 제목 *"><input value={editing.title} onChange={(e) => set({ title: e.target.value })} style={inp()} placeholder="예: 매장 서비스 기본 교육 (1주차)" /></L>
        <L label="소개"><textarea value={editing.description || ""} onChange={(e) => set({ description: e.target.value })} rows={2} style={inp({ resize: "vertical" })} placeholder="이 교육에서 배우는 내용을 알바생에게 소개해 주세요" /></L>

        <div style={{ display: "flex", gap: 16, margin: "6px 0 18px" }}>
          <label style={chk}><input type="checkbox" checked={editing.open_to_applicants} onChange={(e) => set({ open_to_applicants: e.target.checked })} /> 지원자에게도 공개 (면접 전 서면평가)</label>
          <label style={chk}><input type="checkbox" checked={editing.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> 활성화</label>
        </div>

        {/* 학습 섹션 */}
        <SecHead title="📖 학습 내용 (매뉴얼·영상)" onAdd={() => set({ sections: [...editing.sections, { title: "", body: "", video_url: "" }] })} />
        {editing.sections.map((s, i) => (
          <div key={i} style={card}>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={s.title} onChange={(e) => setSec(i, "title", e.target.value)} style={inp({ flex: 1 })} placeholder={`섹션 ${i + 1} 제목 (예: 손님 응대 기본)`} />
              <button onClick={() => set({ sections: editing.sections.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
            </div>
            <input value={s.video_url} onChange={(e) => setSec(i, "video_url", e.target.value)} style={inp({ width: "100%", marginTop: 8 })} placeholder="교육 영상 URL (유튜브 링크 — 선택)" />
            <textarea value={s.body} onChange={(e) => setSec(i, "body", e.target.value)} rows={4} style={inp({ width: "100%", marginTop: 8, resize: "vertical", lineHeight: 1.6 })} placeholder="매뉴얼 본문 (알바생이 읽을 내용)" />
          </div>
        ))}

        {/* 평가 문항 */}
        <SecHead title="📝 평가 문항 (객관식)" onAdd={() => set({ questions: [...editing.questions, { q: "", choices: ["", "", "", ""], answer: 0, kind: "job" }] })} />
        <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>
          유형을 <b>한국어</b>로 선택하면 한국어 평가 점수로 따로 집계됩니다. 정답 보기를 선택(◉)해 주세요.
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.ink2 }}>📚 기본 문항 불러오기:</span>
          {Object.entries(QUESTION_BANKS).map(([k, bank]) => (
            <button key={k} onClick={() => set({ questions: [...editing.questions.filter((q) => q.q.trim()), ...JSON.parse(JSON.stringify(bank.questions))] })} style={{
              padding: "5px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              border: `1px solid ${T.border}`, background: T.paper, color: T.ink2,
            }}>
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
              <input value={q.q} onChange={(e) => setQ(i, { q: e.target.value })} style={inp({ flex: 1 })} placeholder={`문제 ${i + 1} (예: 손님이 들어오면 가장 먼저 해야 할 일은?)`} />
              <button onClick={() => set({ questions: editing.questions.filter((_, j) => j !== i) })} style={xBtn}>✕</button>
            </div>
            {q.choices.map((c, ci) => (
              <div key={ci} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 7 }}>
                <input type="radio" name={`ans-${i}`} checked={q.answer === ci} onChange={() => setQ(i, { answer: ci })} title="정답으로 지정" />
                <input value={c} onChange={(e) => setQ(i, { choices: q.choices.map((cc, cj) => (cj === ci ? e.target.value : cc)) })} style={inp({ flex: 1 })} placeholder={`보기 ${ci + 1}`} />
              </div>
            ))}
          </div>
        ))}

        <Button variant="primaryDark" size="lg" onClick={handleSave} disabled={saving} style={{ width: "100%", marginTop: 10 }}>
          {saving ? "..." : "💾 저장하기"}
        </Button>
      </div>
    );
  }

  // ── 목록 화면 ──
  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, margin: "6px 0 4px" }}>🎓 온보딩 교육 관리</h1>
      <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 16px", lineHeight: 1.7 }}>
        교육 영상·매뉴얼·평가 문항을 등록하면 지원자와 채용된 알바생이 학습하고,
        평가 결과(직무·한국어)가 자동으로 리포트됩니다.
      </p>
      <Button variant="primaryDark" size="md" onClick={() => setEditing(JSON.parse(JSON.stringify(EMPTY_COURSE)))} style={{ marginBottom: 18 }}>
        ➕ 새 교육 과정 만들기
      </Button>

      {brandCourses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 8 }}>🏢 본사 제공 교육</div>
          {brandCourses.map((c) => (
            <div key={c.id} style={{ background: "#F8F5FF", border: "1px solid #E5DBFA", borderRadius: 12, padding: "14px 17px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#7C3AED", background: "#EFE7FD", borderRadius: 999, padding: "2px 8px", marginRight: 7 }}>{c.brand_name} 본사</span>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.ink3, marginTop: 3 }}>
                    섹션 {(c.sections || []).length} · 문항 {(c.questions || []).length} — 우리 매장 지원자·알바생에게 자동 노출됩니다
                  </div>
                </div>
                <Link href={`/employer/training/${c.id}`}><Button variant="secondary" size="sm">📊 우리 매장 결과</Button></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {courses.length === 0 ? (
        <div style={{ background: T.cream, borderRadius: 12, padding: 20, fontSize: 13.5, color: T.ink2 }}>
          아직 만든 교육 과정이 없습니다. 첫 과정을 만들어 보세요!
        </div>
      ) : (
        courses.map((c) => (
          <div key={c.id} style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: "15px 17px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.ink }}>
                  {c.title}
                  {!c.is_active && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#8C6D1F", background: "#FBF3D9", borderRadius: 999, padding: "2px 8px", marginLeft: 8 }}>비활성</span>}
                  {c.open_to_applicants && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#1A56DB", background: "#E8F0FE", borderRadius: 999, padding: "2px 8px", marginLeft: 6 }}>지원자 공개</span>}
                </div>
                <div style={{ fontSize: 12, color: T.ink3, marginTop: 3 }}>
                  섹션 {(c.sections || []).length} · 문항 {(c.questions || []).length} · 응시 {resultCount[c.id] || 0}명
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Link href={`/employer/training/${c.id}`}><Button variant="secondary" size="sm">📊 결과 보기</Button></Link>
                <Button variant="secondary" size="sm" onClick={() => setEditing(JSON.parse(JSON.stringify(c)))}>✏️ 수정</Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function L({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: T.ink2, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}
function SecHead({ title, onAdd }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 8px" }}>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{title}</div>
      <button onClick={onAdd} style={{ ...linkBtn, color: T.coral }}>+ 추가</button>
    </div>
  );
}
const inp = (extra = {}) => ({
  padding: "9px 11px", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 13.5,
  fontFamily: "inherit", color: T.ink, background: T.paper, boxSizing: "border-box", width: extra.flex ? undefined : extra.width, ...extra,
});
const card = { background: T.cream, borderRadius: 10, padding: 13, marginBottom: 10 };
const linkBtn = { border: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit", padding: 0 };
const xBtn = { border: "none", background: "transparent", color: T.ink3, fontSize: 14, cursor: "pointer", fontFamily: "inherit" };
const chk = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: T.ink2, cursor: "pointer" };
