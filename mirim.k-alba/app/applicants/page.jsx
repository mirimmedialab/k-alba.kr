"use client";
import { useState, useEffect, Suspense } from "react";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getJobApplicants, updateApplicationStatus, getCurrentUser } from "@/lib/supabase";
import { KakaoChatModal } from "@/components/KakaoChatModal";
import { ListPageSkel } from "@/components/Wireframe";
import { Button, Badge, Empty } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";
import ResumeView from "@/components/ResumeView";
import { useT } from "@/lib/i18n";

/**
 * /applicants 사장님 지원자 보기 (BI v2)
 *
 * 페르소나 (BI v2 Section 6 — 사장님):
 *   - 무드: 신중·결정 — coralDark + 골드 액센트
 *
 * 변경점 (BI v2):
 *   - Btn, Card (UI.jsx) → Button (Step 3-A)
 *   - 인라인 status 배지 → <Badge> 시맨틱
 *     · pending → warning, accepted → success, rejected → error
 *   - 빈 상태 → <Empty variant="no-results">
 *   - 합격 챗봇 버튼 → Button variant="primaryDark" (사장님 차분 코랄)
 *   - 거절 버튼 → Button variant="secondary"
 *   - 채팅 버튼 → Button variant="ghost"
 *
 * 보존:
 *   - Editorial 헤더 (골드 라인)
 *   - 카카오톡 챗봇 (합격/거절 흐름)
 *   - 국기 이모지 (베트남/중국/캄보디아/우즈벡/몽골)
 *   - 골드 별점 배지
 *   - 인덱스 번호
 *   - 합격 후 시뮬레이터 자동 진입
 *   - botAvatar 🎉/💌 (BI v2 결정과 호환 — 🤖만 금지)
 */

function ApplicantsContent() {
  const t = useT();
  const KOREAN_LABELS = { none: t("applicants.krNone"), beginner: t("applicants.krBeginner"), intermediate: t("applicants.krIntermediate"), advanced: t("applicants.krAdvanced") };
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [resumeFor, setResumeFor] = useState(null); // 이력서 모달 대상 지원자
  const [trainMap, setTrainMap] = useState({}); // worker_id → {job, jobT, ko, koT} 교육 점수 합계
  const [myCourses, setMyCourses] = useState([]); // 사전평가에 쓸 수 있는 과정 (본인 + 본사)
  const [reqMap, setReqMap] = useState({});       // applicant_id → [course_id] 요청 이력
  const [assessFor, setAssessFor] = useState(null); // 사전평가 요청 대상 지원자
  const [chatMode, setChatMode] = useState(null);
  const [activeApplicant, setActiveApplicant] = useState(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      if (jobId) {
        const data = await getJobApplicants(jobId);
        if (data && data.length > 0) {
          setApplicants(data);
          // 내 교육 과정 응시 점수 (RLS: 과정 소유자만 결과 조회 가능)
          try {
            const { data: own } = await supabase.from("training_courses").select("id, title, brand_name, questions").eq("owner_id", u.id).eq("is_active", true);
            const { data: brand } = await supabase.from("training_courses").select("id, title, brand_name, questions").not("brand_name", "is", null).eq("is_active", true);
            const all = [...(own || []), ...(brand || []).filter((b) => !(own || []).some((o) => o.id === b.id))];
            setMyCourses(all);
            const { data: reqs } = await supabase.from("assessment_requests").select("course_id, applicant_id").eq("employer_id", u.id);
            const rm = {};
            for (const r of reqs || []) (rm[r.applicant_id] = rm[r.applicant_id] || []).push(r.course_id);
            setReqMap(rm);
            const myCourses = all;
            const ids = (myCourses || []).map((c) => c.id);
            if (ids.length) {
              const { data: rs } = await supabase
                .from("training_results")
                .select("worker_id, job_score, job_total, korean_score, korean_total")
                .in("course_id", ids);
              const m = {};
              for (const r of rs || []) {
                const cur = m[r.worker_id] || { job: 0, jobT: 0, ko: 0, koT: 0 };
                cur.job += r.job_score; cur.jobT += r.job_total;
                cur.ko += r.korean_score; cur.koT += r.korean_total;
                m[r.worker_id] = cur;
              }
              setTrainMap(m);
            }
          } catch (_) {}
        }
      }
      setLoading(false);
    });
  }, [jobId, router]);

  const handleAssessRequest = async (applicant, course) => {
    try {
      const { error } = await supabase.from("assessment_requests").insert({
        course_id: course.id, employer_id: (await getCurrentUser()).id, applicant_id: applicant.id,
      });
      if (error) {
        if (String(error.message).includes("duplicate")) alert("이미 이 지원자에게 요청한 평가입니다.");
        else alert("요청 실패: " + error.message);
        return;
      }
      setReqMap((m) => ({ ...m, [applicant.id]: [...(m[applicant.id] || []), course.id] }));
      setAssessFor(null);
      alert(`${applicant.name}님에게 '${course.title}' 사전평가를 요청했습니다. 알림이 전송되었어요.`);
    } catch (e) {
      alert(e.message);
    }
  };

  const acceptSteps = activeApplicant ? [
    { type: "bot", text: t("applicants.acc1", { name: activeApplicant.applicant.name }) },
    { type: "bot", text: t("applicants.acc2"), input: { type: "date" }, key: "start_date" },
    { type: "bot", text: t("applicants.acc3"), quickReplies: [t("applicants.qrInterview"), t("applicants.qrOrientation"), t("applicants.qrStartNow")], key: "interview_type" },
    { type: "bot", text: t("applicants.acc4"), quickReplies: [t("applicants.qrWorkplace"), t("applicants.qrCafe"), t("applicants.qrZoom")], key: "meeting_place" },
    { type: "bot", text: (a) => a.interview_type === t("applicants.qrStartNow") ? t("applicants.acc5Start") : t("applicants.acc5Interview"), input: { type: "text", placeholder: t("applicants.acc5Placeholder") }, key: "meeting_time" },
    { type: "bot", text: t("applicants.acc6"), input: { type: "text", placeholder: t("applicants.acc6Placeholder"), optional: true }, key: "message" },
    { type: "bot", text: (a) => t("applicants.acc7", { name: activeApplicant.applicant.name, schedule: a.interview_type === t("applicants.qrStartNow") ? t("applicants.scheduleStart") : a.interview_type + " " + t("applicants.scheduleSuffix") }), delay: 900 },
  ] : [];

  const rejectSteps = activeApplicant ? [
    { type: "bot", text: t("applicants.rej1", { name: activeApplicant.applicant.name }) },
    { type: "bot", text: t("applicants.rej2"), quickReplies: [t("applicants.qrMismatch"), t("applicants.qrOtherCandidate"), t("applicants.qrVisaIssue"), t("applicants.qrWriteOwn")], key: "reason" },
    { type: "bot", text: (a) => a.reason === t("applicants.qrWriteOwn") ? t("applicants.rej3Own") : t("applicants.rej3Other"), input: { type: "text", placeholder: t("applicants.rej3Placeholder"), optional: true }, key: "custom_message" },
    { type: "bot", text: t("applicants.rej4", { name: activeApplicant.applicant.name }), delay: 800 },
  ] : [];

  const handleAction = async (applicant, status) => {
    setActiveApplicant(applicant);
    setChatMode(status);
    setChatOpen(true);
  };

  const handleChatComplete = async (answers) => {
    if (!activeApplicant) return;
    await updateApplicationStatus(activeApplicant.id, chatMode === "accept" ? "accepted" : "rejected");
    setApplicants((prev) =>
      prev.map((a) => a.id === activeApplicant.id ? { ...a, status: chatMode === "accept" ? "accepted" : "rejected" } : a)
    );

    if (chatMode === "accept") {
      setTimeout(() => {
        const simJobId = jobId === "2" ? "k2" : jobId === "3" ? "k3" : "k1";
        router.push(`/simulator?mode=boss&job=${simJobId}&autostart=1`);
      }, 1500);
    }
  };

  const filtered = filter === "all" ? applicants : applicants.filter((a) => a.status === filter);

  // status → Badge variant 매핑
  const statusVariant = {
    pending: "warning",
    accepted: "success",
    rejected: "error",
  };
  const statusLabel = {
    pending: t("applicants.statusPending"),
    accepted: t("applicants.statusAccepted"),
    rejected: t("applicants.statusRejected"),
  };

  // 국기 이모지
  const getFlag = (country) => {
    if (country === "베트남") return "🇻🇳";
    if (country === "중국") return "🇨🇳";
    if (country === "캄보디아") return "🇰🇭";
    if (country === "우즈베키스탄") return "🇺🇿";
    if (country === "몽골") return "🇲🇳";
    return "🌏";
  };

  if (loading) return <ListPageSkel maxWidth={700} rows={3} />;

  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 28px 64px" }}>
        <Link href="/my/jobs" style={{ color: T.ink3, fontSize: 13, marginBottom: 18, display: "inline-block", textDecoration: "none" }}>← {t("applicants.backToJobs")}</Link>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Applicants · {t("applicants.kicker")}</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.2 }}>{t("applicants.count", { n: applicants.length })}</h1>
        <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>{t("applicants.desc")}</p>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}` }}>
          {[["all", t("applicants.filterAll"), applicants.length], ["pending", t("applicants.filterPending"), applicants.filter(a => a.status === "pending").length], ["accepted", t("applicants.filterAccepted"), applicants.filter(a => a.status === "accepted").length], ["rejected", t("applicants.filterRejected"), applicants.filter(a => a.status === "rejected").length]].map(([v, l, n]) => {
            const active = filter === v;
            return (
              <button key={v} onClick={() => setFilter(v)} style={{ padding: "10px 14px", background: "transparent", border: "none", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.ink : T.ink3, borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent", marginBottom: -1, cursor: "pointer", fontFamily: "inherit" }}>
                {l} <span style={{ color: T.ink3, fontWeight: 600 }}>({n})</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <Empty variant="no-results" description={t("applicants.empty")} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {filtered.map((a) => (
              <div key={a.id} style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", background: T.paper, boxSizing: "border-box" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 20 }}>{getFlag(a.applicant.country)}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>{a.applicant.name}</span>
                  {a.applicant.rating && <span style={{ fontSize: 11, fontWeight: 700, color: T.gold, background: T.n9, padding: "2px 7px", borderRadius: 4 }}>⭐ {a.applicant.rating}</span>}
                  <Badge variant={statusVariant[a.status] || "neutral"} size="sm">{statusLabel[a.status] || a.status}</Badge>
                </div>
                <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>{a.applicant.country} · {a.applicant.visa} · {KOREAN_LABELS[a.applicant.korean_level] || "-"}</div>
                {a.applicant.organization && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 4 }}>{a.applicant.organization}</div>}
                {a.message && <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, background: T.cream, padding: "10px 12px", borderLeft: `3px solid ${T.gold}`, margin: "10px 0", borderRadius: "0 4px 4px 0" }}>{a.message}</div>}
                <div style={{ fontSize: 11, color: T.ink3, marginBottom: 12 }}>{t("applicants.appliedDate")}: {new Date(a.created_at).toLocaleDateString("ko-KR")}</div>
                {a.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button variant="primaryDark" size="sm" onClick={() => handleAction(a, "accept")}>💬 {t("applicants.acceptBot")}</Button>
                    <Button variant="secondary" size="sm" onClick={() => handleAction(a, "reject")}>{t("applicants.reject")}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <KakaoChatModal
          open={chatOpen}
          onClose={() => { setChatOpen(false); setTimeout(() => setActiveApplicant(null), 300); }}
          title={chatMode === "accept" ? "🎉 " + t("applicants.acceptBotTitle") : "💌 " + t("applicants.rejectBotTitle")}
          botAvatar={chatMode === "accept" ? "🎉" : "💌"}
          steps={chatMode === "accept" ? acceptSteps : rejectSteps}
          onComplete={handleChatComplete}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <Link href="/my/jobs" style={{
        color: T.ink3, fontSize: 12, marginBottom: 18,
        display: "inline-block", textDecoration: "none", letterSpacing: "-0.01em",
      }}>
        ← {t("applicants.backToJobs")}
      </Link>

      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Applicants · {t("applicants.kicker")}
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        {t("applicants.count", { n: applicants.length })}
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        {t("applicants.desc")}
      </p>

      {/* 상태 필터 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {[
          ["all", t("applicants.filterAll"), applicants.length],
          ["pending", t("applicants.filterPending"), applicants.filter(a => a.status === "pending").length],
          ["accepted", t("applicants.filterAccepted"), applicants.filter(a => a.status === "accepted").length],
          ["rejected", t("applicants.filterRejected"), applicants.filter(a => a.status === "rejected").length],
        ].map(([v, l, n]) => {
          const active = filter === v;
          return (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? T.ink : T.ink3,
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {l} <span style={{ color: T.ink3, fontWeight: 600 }}>({n})</span>
            </button>
          );
        })}
      </div>

      <div>
        {filtered.length === 0 ? (
          // Step 3-C Empty
          <Empty
            variant="no-results"
            description={t("applicants.empty")}
          />
        ) : (
          filtered.map((a, idx) => (
            <div key={a.id} style={{
              padding: "20px 0",
              borderBottom: `1px solid ${T.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 12 }}>
                <div style={{
                  minWidth: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.ink3,
                  paddingTop: 3,
                  letterSpacing: "-0.01em",
                }}>
                  {String(idx + 1).padStart(2, "0")}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 20 }}>{getFlag(a.applicant.country)}</span>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: T.ink,
                      letterSpacing: "-0.02em",
                    }}>
                      {a.applicant.name}
                    </span>
                    {a.applicant.rating && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.gold,
                        background: T.n9,
                        padding: "2px 7px",
                        borderRadius: 2,
                        letterSpacing: "0.02em",
                      }}>
                        ⭐ {a.applicant.rating}
                      </span>
                    )}
                    {/* 상태 배지 — Step 3-A Badge 시맨틱 */}
                    <Badge
                      variant={statusVariant[a.status] || "neutral"}
                      size="sm"
                    >
                      {statusLabel[a.status] || a.status}
                    </Badge>
                  </div>

                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4, lineHeight: 1.5 }}>
                    {a.applicant.country} · {a.applicant.visa} · {KOREAN_LABELS[a.applicant.korean_level] || "-"}
                  </div>
                  {a.applicant.organization && (
                    <div style={{ fontSize: 12, color: T.ink3 }}>
                      {a.applicant.organization}
                    </div>
                  )}
                  {trainMap[a.applicant.id] && (
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {trainMap[a.applicant.id].jobT > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: T.coral, background: "#FFF1EC", borderRadius: 999, padding: "3px 9px" }}>
                          🎓 직무 {Math.round((trainMap[a.applicant.id].job / trainMap[a.applicant.id].jobT) * 100)}%
                        </span>
                      )}
                      {trainMap[a.applicant.id].koT > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#1A56DB", background: "#E8F0FE", borderRadius: 999, padding: "3px 9px" }}>
                          🇰🇷 한국어 {Math.round((trainMap[a.applicant.id].ko / trainMap[a.applicant.id].koT) * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 지원 메시지 */}
              {a.message && (
                <div style={{
                  fontSize: 13,
                  color: T.ink2,
                  lineHeight: 1.6,
                  background: T.cream,
                  padding: "12px 14px",
                  borderLeft: `3px solid ${T.gold}`,
                  marginBottom: 12,
                  marginLeft: 40,
                }}>
                  {a.message}
                </div>
              )}

              <div style={{
                fontSize: 11,
                color: T.ink3,
                marginBottom: 12,
                marginLeft: 40,
              }}>
                {t("applicants.appliedDate")}: {new Date(a.created_at).toLocaleDateString("ko-KR")}
              </div>

              {/* 액션 버튼 — Step 3-A Button (사장님 페이지 = primaryDark) */}
              <div style={{ marginLeft: 40, marginBottom: a.status === "pending" ? 8 : 0, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="secondary" size="sm" onClick={() => setResumeFor(a)}>
                  📄 {t("resume.view")}
                </Button>
                {myCourses.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setAssessFor(a)}>
                    📝 사전평가 요청
                  </Button>
                )}
                {(reqMap[a.applicant.id] || []).length > 0 && !trainMap[a.applicant.id] && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#8C6D1F", background: "#FBF3D9", borderRadius: 999, padding: "3px 9px" }}>
                    ⏳ 사전평가 응시 대기
                  </span>
                )}
              </div>
              {a.status === "pending" && (
                <div style={{ display: "flex", gap: 6, marginLeft: 40, flexWrap: "wrap" }}>
                  <Button
                    variant="primaryDark"
                    size="sm"
                    onClick={() => handleAction(a, "accept")}
                  >
                    💬 {t("applicants.acceptBot")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAction(a, "reject")}
                  >
                    {t("applicants.reject")}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 사전평가 과정 선택 모달 */}
      {assessFor && (
        <div onClick={() => setAssessFor(null)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, maxWidth: 460, width: "100%", maxHeight: "80vh", overflow: "auto", padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 4 }}>📝 {assessFor.applicant?.name}님에게 사전평가 요청</div>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 12 }}>면접 전에 직무·한국어 수준을 확인할 평가를 선택하세요. 지원자에게 알림이 전송됩니다.</div>
            {myCourses.map((c) => {
              const already = (reqMap[assessFor.applicant?.id] || []).includes(c.id);
              const nKo = (c.questions || []).filter((q) => q.kind === "korean").length;
              const nJob = (c.questions || []).length - nKo;
              return (
                <button key={c.id} disabled={already} onClick={() => handleAssessRequest(assessFor.applicant, c)} style={{
                  display: "block", width: "100%", textAlign: "left", padding: "12px 14px", marginBottom: 8,
                  borderRadius: 10, border: `1px solid ${T.border}`, background: already ? "#F5F5F5" : "#FAFBFF",
                  cursor: already ? "default" : "pointer", fontFamily: "inherit", opacity: already ? 0.6 : 1,
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: T.ink }}>
                    {c.brand_name && <span style={{ fontSize: 10, fontWeight: 800, color: "#7C3AED", background: "#EFE7FD", borderRadius: 999, padding: "2px 7px", marginRight: 6 }}>{c.brand_name} 본사</span>}
                    {c.title} {already && "· ✓ 요청됨"}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 3 }}>직무 {nJob}문항 · 한국어 {nKo}문항</div>
                </button>
              );
            })}
            <button onClick={() => setAssessFor(null)} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: T.ink2 }}>닫기</button>
          </div>
        </div>
      )}

      {/* 지원자 이력서 모달 */}
      {resumeFor && (
        <ResumeView
          userId={resumeFor.applicant?.id}
          name={resumeFor.applicant?.name || ""}
          onClose={() => setResumeFor(null)}
        />
      )}

      {/* 사장님 카톡 챗봇 - 합격/불합격 (🎉/💌은 BI v2와 호환, 🤖만 금지) */}
      <KakaoChatModal
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setTimeout(() => setActiveApplicant(null), 300);
        }}
        title={chatMode === "accept" ? "🎉 " + t("applicants.acceptBotTitle") : "💌 " + t("applicants.rejectBotTitle")}
        botAvatar={chatMode === "accept" ? "🎉" : "💌"}
        steps={chatMode === "accept" ? acceptSteps : rejectSteps}
        onComplete={handleChatComplete}
      />
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<ListPageSkel maxWidth={700} rows={3} />}>
      <ApplicantsContent />
    </Suspense>
  );
}
