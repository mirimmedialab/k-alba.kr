"use client";
import { useState, useEffect, Suspense } from "react";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getJobApplicants, updateApplicationStatus, getCurrentUser } from "@/lib/supabase";
import { KakaoChatModal } from "@/components/KakaoChatModal";
import { ListPageSkel } from "@/components/Wireframe";
import { Button, Badge, Empty } from "@/components/ui";

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

const DEMO_APPLICANTS = [
  { id: 1, applicant_id: "u1", status: "pending", message: "성실하게 일하겠습니다!", created_at: "2026-04-12", applicant: { name: "Linh T.", country: "베트남", visa: "D-2", korean_level: "intermediate", rating: 4.8, organization: "서울대학교" } },
  { id: 2, applicant_id: "u2", status: "pending", message: "카페 경험 2년 있습니다.", created_at: "2026-04-11", applicant: { name: "Wang X.", country: "중국", visa: "F-4", korean_level: "advanced", rating: 4.5, organization: "연세대학교" } },
  { id: 3, applicant_id: "u3", status: "accepted", message: "", created_at: "2026-04-10", applicant: { name: "Sokha M.", country: "캄보디아", visa: "F-6", korean_level: "intermediate", rating: 4.9, organization: "" } },
];

const KOREAN_LABELS = { none: "한국어 불필요", beginner: "초급", intermediate: "중급", advanced: "고급" };

function ApplicantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [applicants, setApplicants] = useState(DEMO_APPLICANTS);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState(null);
  const [activeApplicant, setActiveApplicant] = useState(null);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      if (jobId) {
        const data = await getJobApplicants(jobId);
        if (data && data.length > 0) setApplicants(data);
      }
      setLoading(false);
    });
  }, [jobId, router]);

  const acceptSteps = activeApplicant ? [
    { type: "bot", text: `🎉 ${activeApplicant.applicant.name}님을 합격시키시는군요!\n\n빠르게 몇 가지만 확인하면 자동으로 합격 알림이 전송됩니다.` },
    { type: "bot", text: "📅 첫 출근일을 정해주세요.\n(나중에 채팅에서 변경 가능)", input: { type: "date" }, key: "start_date" },
    { type: "bot", text: "🤝 출근 전 면접/오리엔테이션이 필요한가요?", quickReplies: ["면접 필요", "오리엔테이션", "바로 출근"], key: "interview_type" },
    { type: "bot", text: "📍 만남 장소는 어디로 할까요?", quickReplies: ["사업장에서", "근처 카페", "줌(화상)"], key: "meeting_place" },
    { type: "bot", text: (a) => `⏰ ${a.interview_type === "바로 출근" ? "출근 시간" : "면접 시간"}을 알려주세요.`, input: { type: "text", placeholder: "예: 오전 10시, 오후 2시" }, key: "meeting_time" },
    { type: "bot", text: "💬 합격자에게 보낼 메시지 (선택)", input: { type: "text", placeholder: "축하 메시지나 준비물 안내", optional: true }, key: "message" },
    { type: "bot", text: (a) => `✅ 모든 정보가 입력되었어요!\n\n📤 ${activeApplicant.applicant.name}님께 자동 발송:\n• 합격 알림\n• ${a.interview_type === "바로 출근" ? "출근 안내" : a.interview_type + " 일정"}\n• 채팅방 자동 생성\n\n💡 다음 단계: 근로계약서 작성!`, delay: 900 },
  ] : [];

  const rejectSteps = activeApplicant ? [
    { type: "bot", text: `😔 ${activeApplicant.applicant.name}님을 불합격시키시는군요.` },
    { type: "bot", text: "💌 정중한 거절 메시지를 보내드릴게요.\n사유를 선택해주세요.", quickReplies: ["조건 불일치", "다른 후보 선정", "비자 문제", "직접 작성"], key: "reason" },
    { type: "bot", text: (a) => a.reason === "직접 작성" ? "직접 메시지를 작성해주세요." : "추가로 전하실 메시지가 있나요? (선택)", input: { type: "text", placeholder: "메시지", optional: true }, key: "custom_message" },
    { type: "bot", text: `📤 ${activeApplicant.applicant.name}님께 정중한 거절 알림을 보냈습니다.\n좋은 인연이 다음에 있길 바랍니다.`, delay: 800 },
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
    pending: "검토 중",
    accepted: "합격",
    rejected: "불합격",
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

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <Link href="/my/jobs" style={{
        color: T.ink3, fontSize: 12, marginBottom: 18,
        display: "inline-block", textDecoration: "none", letterSpacing: "-0.01em",
      }}>
        ← 내 공고로
      </Link>

      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Applicants · 지원자 관리
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        지원자 {applicants.length}명
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        각 지원자를 확인하고 합격·거절을 결정하세요. 합격 시 카톡 챗봇으로 자동 알림이 전송됩니다.
      </p>

      {/* 상태 필터 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {[
          ["all", "전체", applicants.length],
          ["pending", "검토 중", applicants.filter(a => a.status === "pending").length],
          ["accepted", "합격", applicants.filter(a => a.status === "accepted").length],
          ["rejected", "불합격", applicants.filter(a => a.status === "rejected").length],
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
            description="해당하는 지원자가 없습니다"
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
                지원일: {new Date(a.created_at).toLocaleDateString("ko-KR")}
              </div>

              {/* 액션 버튼 — Step 3-A Button (사장님 페이지 = primaryDark) */}
              {a.status === "pending" && (
                <div style={{ display: "flex", gap: 6, marginLeft: 40, flexWrap: "wrap" }}>
                  <Button
                    variant="primaryDark"
                    size="sm"
                    onClick={() => handleAction(a, "accept")}
                  >
                    💬 합격 챗봇
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAction(a, "reject")}
                  >
                    거절
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    href="/chat"
                  >
                    💬 채팅
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 사장님 카톡 챗봇 - 합격/불합격 (🎉/💌은 BI v2와 호환, 🤖만 금지) */}
      <KakaoChatModal
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setTimeout(() => setActiveApplicant(null), 300);
        }}
        title={chatMode === "accept" ? "🎉 합격 안내봇" : "💌 거절 안내봇"}
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
