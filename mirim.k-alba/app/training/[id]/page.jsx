"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { PageLoading, Button } from "@/components/ui";
import AssessmentReport from "@/components/AssessmentReport";

/**
 * /training/[id] — 학습(영상+매뉴얼) → 평가 응시 → 결과 저장
 *
 * questions[].kind: 'job'(직무) | 'korean'(한국어) — 점수 분리 저장.
 * 결과는 training_results upsert → 사장님 리포트에서 열람.
 */

// 한국어 듣기 재생 (브라우저 음성합성)
function speakKorean(text) {
  try {
    if (!window.speechSynthesis) { alert("이 기기에서는 음성 재생이 지원되지 않습니다."); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.rate = 0.88;
    window.speechSynthesis.speak(u);
  } catch (_) {}
}

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
  const [hired, setHired] = useState(false);       // 채용 확정 여부 (계약 or 합격) — 직무 평가 응시 조건
  const [trans, setTrans] = useState(null);        // 번역본 {sections, questions}
  const [showTrans, setShowTrans] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false); // 학습 후 평가 시작 게이트

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
        // 채용 확정 여부: 과정 소유 사장님과의 계약/합격, 또는 브랜드 매칭 사장님과의 계약/합격
        try {
          const { data: myContracts } = await supabase
            .from("contracts")
            .select("employer_id, employer:profiles!contracts_employer_id_fkey(company_name)")
            .eq("worker_id", u.id);
          const { data: myAccepted } = await supabase
            .from("applications")
            .select("job:jobs(employer_id, employer:profiles(company_name))")
            .eq("applicant_id", u.id)
            .eq("status", "accepted");
          const employers = [
            ...(myContracts || []).map((x) => ({ id: x.employer_id, company: x.employer?.company_name || "" })),
            ...(myAccepted || []).map((x) => ({ id: x.job?.employer_id, company: x.job?.employer?.company_name || "" })),
          ];
          const isHired = c.brand_name
            ? employers.some((e) => (e.company || "").includes(c.brand_name))
            : employers.some((e) => e.id === c.owner_id);
          setHired(isHired);
        } catch (_) {}
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTranslate = async () => {
    if (showTrans) { setShowTrans(false); return; }
    if (trans) { setShowTrans(true); return; }

    // 1순위: 본사/사장님이 업로드한 번역·자막 파일 (sections[].i18n)
    const secs = course.sections || [];
    const hasManual = secs.some((s) => s.i18n && (s.i18n[locale] || s.i18n.en));
    if (hasManual) {
      setTrans({
        sections: secs.map((s) => ({
          ...s,
          body: (s.i18n && (s.i18n[locale] || s.i18n.en)) || s.body,
        })),
        questions: course.questions || [], // 문항은 원문 유지 (자막 번역 범위 밖)
      });
      setShowTrans(true);
      return;
    }

    // 2순위: 자동 번역 API (설정된 경우)
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
    // 미채용 지원자는 한국어(사전평가) 문항만 응시
    const eligible = qs.map((q, i) => ({ q, i })).filter(({ q }) => (hired ? q.kind !== "korean" : q.kind === "korean"));
    if (eligible.some(({ i }) => answers[i] === undefined)) { alert(t("training.answerAll")); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      let jobScore = 0, jobTotal = 0, koreanScore = 0, koreanTotal = 0;
      eligible.forEach(({ q, i }) => {
        const ok = answers[i] === q.answer;
        if (q.kind === "korean") { koreanTotal++; if (ok) koreanScore++; }
        else { jobTotal++; if (ok) jobScore++; }
      });
      // 이번에 응시하지 않은 파트는 기존 기록(사전평가 등)을 보존
      if (hired && prev) { koreanScore = prev.korean_score || 0; koreanTotal = prev.korean_total || 0; }
      if (!hired && prev) { jobScore = prev.job_score || 0; jobTotal = prev.job_total || 0; }
      const row = {
        course_id: course.id, worker_id: user.id,
        job_score: jobScore, job_total: jobTotal,
        korean_score: koreanScore, korean_total: koreanTotal,
        answers: qs.map((q, i) => {
          const taken = hired ? q.kind !== "korean" : q.kind === "korean";
          if (taken) return answers[i] === undefined ? null : answers[i];
          return prev?.answers?.[i] ?? null; // 미응시 파트: 이전 답안 보존
        }),
        completed_at: new Date().toISOString(),
        // 재응시 시 이전 회차를 이력으로 보존 (성장 추이)
        attempts: prev
          ? [...(prev.attempts || []), { job_score: prev.job_score, job_total: prev.job_total, korean_score: prev.korean_score, korean_total: prev.korean_total, completed_at: prev.completed_at }].slice(-10)
          : [],
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
        {t("training.by")}: {course.brand_name || course.owner?.company_name || course.owner?.name || "-"}
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

          {!quizStarted ? (
            <div style={{ background: T.cream, borderRadius: 12, padding: 18, textAlign: "center" }}>
              <div style={{ fontSize: 12.5, color: T.ink2, marginBottom: 12 }}>{t("training.studyFirst")}</div>
              <Button variant="primary" size="md" onClick={() => setQuizStarted(true)}>{t("training.startQuiz")}</Button>
            </div>
          ) : null}
          {quizStarted && [
            { kind: "korean", header: `🇰🇷 ${t("training.koreanScore")}` },
            { kind: "job", header: `💼 ${t("training.jobScore")}` },
          ].map(({ kind, header }) => {
            const grouped = viewQs.map((q, qi) => ({ q, qi })).filter(({ q }) => (q.kind === "korean" ? "korean" : "job") === kind);
            if (!grouped.length) return null;
            if (kind === "job" && !hired) {
              return (
                <div key={kind} style={{ background: "#F5F5F5", border: `1px dashed ${T.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 12, fontSize: 12.5, color: T.ink3, lineHeight: 1.7 }}>
                  🔒 {t("training.jobLocked", { n: grouped.length })}
                </div>
              );
            }
            if (kind === "korean" && hired) return null; // 옵션 B: 채용 후에는 직무 평가만 (한국어는 사전평가 전용)
            return (
              <div key={kind} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: kind === "korean" ? "#1A56DB" : T.coral, margin: "12px 0 8px" }}>{header} ({grouped.length})</div>
                {grouped.map(({ q, qi }) => (
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
              {q.passage && (
                <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 13px", marginBottom: 10, fontSize: 13, color: T.ink, lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  📄 {q.passage}
                </div>
              )}
              {q.tts && (
                <div style={{ marginBottom: 10 }}>
                  <button onClick={() => speakKorean(q.tts)} style={{
                    padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                    border: "1.5px solid #1A56DB", background: "#EFF4FE", color: "#1A56DB",
                  }}>
                    {t("training.listen")}
                  </button>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 5 }}>{t("training.listenHint")}</div>
                </div>
              )}
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
              </div>
            );
          })}

          {quizStarted && !result ? (
            <Button variant="primary" size="lg" onClick={handleSubmit} disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "..." : `✅ ${t("training.submit")}`}
            </Button>
          ) : result ? (
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
              <button onClick={() => setShowReport(true)} style={{
                marginTop: 10, padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.ink,
              }}>
                📋 {t("report.title")}
              </button>
            </div>
          ) : null}

          {prev && !result && (
            <div style={{ marginTop: 10, textAlign: "center" }}>
              <button onClick={() => setShowReport(true)} style={{
                padding: "9px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.ink,
              }}>
                📋 {t("report.title")}
              </button>
            </div>
          )}
          {prev && !result && (
            <div style={{ marginTop: 4, fontSize: 12.5, color: T.ink3, textAlign: "center" }}>
              ✓ {t("training.done")}:
              {prev.job_total > 0 && <> {t("training.jobScore")} {prev.job_score}/{prev.job_total}</>}
              {prev.korean_total > 0 && <> · {t("training.koreanScore")} {prev.korean_score}/{prev.korean_total}</>}
              {" — "}{t("training.retake")} ⬆
            </div>
          )}
        </div>
      )}

      {showReport && (prev || result) && (
        <AssessmentReport course={course} result={result || prev} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
