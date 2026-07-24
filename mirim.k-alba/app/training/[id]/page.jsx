"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { PageLoading, Button } from "@/components/ui";

/**
 * /training/[id] — 학습(영상+매뉴얼) → 평가 응시 → 결과 저장
 *
 * questions[].kind: 'job'(직무) | 'korean'(한국어) — 점수 분리 저장.
 * 결과는 training_results upsert → 사장님 리포트에서 열람.
 */

// 유튜브 URL → embed 변환
function toEmbed(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function TrainingCoursePage() {
  const router = useRouter();
  const { id } = useParams();
  const t = useT();
  const { locale } = useLocale();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [answers, setAnswers] = useState({});  // qIdx → choiceIdx
  const [result, setResult] = useState(null);  // 제출 후 결과
  const [prev, setPrev] = useState(null);      // 기존 응시 결과
  const [submitting, setSubmitting] = useState(false);
  const [trans, setTrans] = useState(null);        // 번역본 {sections, questions}
  const [showTrans, setShowTrans] = useState(false);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.replace("/login"); return; }
      setUser(u);
      const { data: c } = await supabase
        .from("training_courses")
        .select("*, owner:profiles!training_courses_owner_id_fkey(company_name, name)")
        .eq("id", id)
        .maybeSingle();
      setCourse(c || null);
      if (c) {
        const { data: r } = await supabase
          .from("training_results").select("*").eq("course_id", c.id).eq("worker_id", u.id).maybeSingle();
        setPrev(r || null);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTranslate = async () => {
    if (showTrans) { setShowTrans(false); return; }
    if (trans) { setShowTrans(true); return; }
    if (translating) return;
    setTranslating(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch("/api/training/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess?.session?.access_token}` },
        body: JSON.stringify({ course_id: course.id, lang: locale }),
      });
      const d = await res.json();
      if (!d.ok) {
        alert(d.error === "translation_unconfigured" ? t("training.translateUnavailable") : d.error);
        return;
      }
      setTrans({ sections: d.sections, questions: d.questions });
      setShowTrans(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async () => {
    const qs = course.questions || [];
    if (qs.some((_, i) => answers[i] === undefined)) { alert(t("training.answerAll")); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      let jobScore = 0, jobTotal = 0, koreanScore = 0, koreanTotal = 0;
      qs.forEach((q, i) => {
        const ok = answers[i] === q.answer;
        if (q.kind === "korean") { koreanTotal++; if (ok) koreanScore++; }
        else { jobTotal++; if (ok) jobScore++; }
      });
      const row = {
        course_id: course.id, worker_id: user.id,
        job_score: jobScore, job_total: jobTotal,
        korean_score: koreanScore, korean_total: koreanTotal,
        answers: qs.map((_, i) => answers[i]),
        completed_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("training_results").upsert(row, { onConflict: "course_id,worker_id" });
      if (error) throw error;
      setResult(row);
      setPrev(row);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!course) return <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>404</div>;

  const qs = course.questions || [];
  const viewSections = showTrans && trans ? trans.sections : (course.sections || []);
  const viewQs = showTrans && trans ? trans.questions : qs;

  return (
    <div style={{ padding: "24px 20px 80px", maxWidth: 720, margin: "0 auto" }}>
      <Link href="/training" style={{ color: T.ink3, fontSize: 13, fontWeight: 600 }}>← {t("training.title")}</Link>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: "14px 0 2px" }}>{course.title}</h1>
      <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 16 }}>
        {t("training.by")}: {course.owner?.company_name || course.owner?.name || "-"}
      </div>
      {course.description && <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.7, marginBottom: 12 }}>{course.description}</p>}

      {locale !== "ko" && (
        <button onClick={handleTranslate} disabled={translating} style={{
          marginBottom: 16, padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 800,
          border: `1.5px solid ${showTrans ? T.border : T.coral}`, cursor: "pointer", fontFamily: "inherit",
          background: showTrans ? T.paper : "#FFF1EC", color: showTrans ? T.ink2 : T.coral,
        }}>
          {translating ? `⏳ ${t("training.translating")}` : showTrans ? `📄 ${t("training.showOriginal")}` : `🌐 ${t("training.translate")}`}
        </button>
      )}

      {/* 학습 섹션 */}
      <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 10 }}>📖 {t("training.sections")}</div>
      {viewSections.map((s, i) => {
        const embed = toEmbed(s.video_url);
        return (
          <div key={i} style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 8 }}>{i + 1}. {s.title}</div>
            {embed && (
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 10, borderRadius: 8, overflow: "hidden" }}>
                <iframe src={embed} title={s.title} allowFullScreen
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }} />
              </div>
            )}
            {!embed && s.video_url && (
              <a href={s.video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: T.coral, marginBottom: 8 }}>
                {t("training.watchVideo")}
              </a>
            )}
            {s.body && <div style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{s.body}</div>}
          </div>
        );
      })}

      {/* 평가 */}
      {qs.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4 }}>📝 {t("training.quiz")}</div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 14 }}>{t("training.quizDesc")}</div>

          {viewQs.map((q, qi) => (
            <div key={qi} style={{ background: T.cream, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink, marginBottom: 10, lineHeight: 1.6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "2px 8px", marginRight: 6, verticalAlign: "1px",
                  background: q.kind === "korean" ? "#E8F0FE" : "#FFF1EC",
                  color: q.kind === "korean" ? "#1A56DB" : T.coral,
                }}>
                  {q.kind === "korean" ? t("training.kindKorean") : t("training.kindJob")}
                </span>
                Q{qi + 1}. {q.q}
              </div>
              {(q.choices || []).map((ch, ci) => {
                const selected = answers[qi] === ci;
                const showAnswer = result != null;
                const isAnswer = q.answer === ci;
                return (
                  <button key={ci} onClick={() => !result && setAnswers((a) => ({ ...a, [qi]: ci }))} style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 13px", marginBottom: 6,
                    borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", cursor: result ? "default" : "pointer",
                    border: `1.5px solid ${showAnswer && isAnswer ? "#0E7A3D" : selected ? T.coral : T.border}`,
                    background: showAnswer && isAnswer ? "#DDF3E4" : selected ? "#FFF1EC" : T.paper,
                    color: T.ink, lineHeight: 1.5,
                  }}>
                    {String.fromCharCode(9312 + ci)} {ch}
                    {showAnswer && selected && !isAnswer && <span style={{ color: "#B3261E", fontWeight: 800 }}> ✗</span>}
                    {showAnswer && isAnswer && <span style={{ color: "#0E7A3D", fontWeight: 800 }}> ✓</span>}
                  </button>
                );
              })}
            </div>
          ))}

          {!result ? (
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "..." : `✅ ${t("training.submit")}`}
            </Button>
          ) : (
            <div style={{ background: "#F0FAF4", border: "1px solid #CBEBD6", borderRadius: 12, padding: 18, textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 8 }}>🎉 {t("training.resultTitle")}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 22, marginBottom: 8 }}>
                {result.job_total > 0 && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: T.coral }}>{result.job_score}/{result.job_total}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, fontWeight: 700 }}>{t("training.jobScore")}</div>
                  </div>
                )}
                {result.korean_total > 0 && (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1A56DB" }}>{result.korean_score}/{result.korean_total}</div>
                    <div style={{ fontSize: 11.5, color: T.ink3, fontWeight: 700 }}>{t("training.koreanScore")}</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.ink3 }}>{t("training.resultSaved")}</div>
            </div>
          )}

          {prev && !result && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: T.ink3, textAlign: "center" }}>
              ✓ {t("training.done")}: {t("training.jobScore")} {prev.job_score}/{prev.job_total}
              {prev.korean_total > 0 && <> · {t("training.koreanScore")} {prev.korean_score}/{prev.korean_total}</>}
              {" — "}{t("training.retake")} ⬆
            </div>
          )}
        </div>
      )}
    </div>
  );
}
