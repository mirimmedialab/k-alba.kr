"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getCurrentUser, getMyJobs } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { KakaoChatModal } from "@/components/KakaoChatModal";
import { ListPageSkel } from "@/components/Wireframe";

const DEMO_JOBS = [
  { id: 1, title: "카페 바리스타", job_type: "카페", pay_type: "시급", pay_amount: 12000, address: "서울 강남구 테헤란로 152", applicant_count: 12, status: "active", created_at: "2026-04-10" },
  { id: 2, title: "딸기 수확 작업자", job_type: "농업", pay_type: "일급", pay_amount: 150000, address: "충남 논산시 강경읍", applicant_count: 28, status: "active", created_at: "2026-04-08" },
  { id: 3, title: "한식당 서빙", job_type: "식당", pay_type: "시급", pay_amount: 11500, address: "서울 용산구 이태원로 200", applicant_count: 7, status: "closed", created_at: "2026-04-01" },
];

export default function MyJobsPage() {
  const router = useRouter();
  const t = useT();
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [loading, setLoading] = useState(true);
  const [notifChatOpen, setNotifChatOpen] = useState(false);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const data = await getMyJobs(u.id);
      if (data && data.length > 0) setJobs(data);
      setLoading(false);

      if (typeof window !== "undefined") {
        const shown = sessionStorage.getItem("k-alba-applicant-notified");
        if (!shown) {
          setTimeout(() => {
            setNotifChatOpen(true);
            sessionStorage.setItem("k-alba-applicant-notified", "1");
          }, 1500);
        }
      }
    });
  }, [router]);

  const notificationSteps = [
    {
      type: "bot",
      text: "🔔 새로운 지원자 알림!\n\n방금 카페 바리스타 공고에 새로운 지원이 있어요!",
    },
    {
      type: "bot",
      text: "👤 Linh T. (베트남, D-2 비자)\n🎓 서울대학교 어학당\n🗣️ 한국어: 중급\n⭐ K-ALBA 평점: 4.8/5.0\n\n💬 \"성실하게 일하겠습니다! 카페 알바 6개월 경험 있습니다.\"",
    },
    {
      type: "bot",
      text: "어떻게 진행하시겠어요?",
      quickReplies: ["지금 검토하기", "나중에 보기", "자동 면접 안내"],
      key: "action",
    },
    {
      type: "bot",
      text: (a) => {
        if (a.action === "지금 검토하기") {
          return "✅ 지원자 페이지로 이동합니다.\n채팅창 닫고 → 공고의 \"지원자 보기\" 클릭!";
        }
        if (a.action === "자동 면접 안내") {
          return "🤖 AI가 자동으로 면접 일정을 조율해드립니다.\n오늘 오후 5시까지 응답을 받아 알려드릴게요!";
        }
        return "👍 알겠습니다. 24시간 내에 응답하시는 것을 권장드려요!";
      },
      delay: 800,
    },
  ];

  if (loading) return <ListPageSkel maxWidth={820} showAction rows={3} />;

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.ink3,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {t("myJobs.header")}
      </div>

      {/* 새 지원자 알림 (강조: 네이비 + 골드) */}
      <div
        onClick={() => setNotifChatOpen(true)}
        style={{
          background: T.n9,
          color: T.paper,
          padding: "14px 16px",
          borderRadius: 4,
          borderLeft: `3px solid ${T.gold}`,
          marginTop: 20,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
        }}
      >
        <div style={{ fontSize: 22 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.01em",
              marginBottom: 2,
            }}
          >
            {t("myJobs.newApplicantNotif")}{" "}
            <span style={{ color: T.gold }}>{t("myJobs.newApplicantCount").replace("{count}", 3)}</span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
            {t("myJobs.tapToViewChat")}
          </div>
        </div>
        <div style={{ fontSize: 18, color: T.gold }}>→</div>
      </div>

      {/* 계약서 챗봇 배너 (보조: outlined) */}
      <Link
        href="/simulator?mode=boss&job=k1&autostart=1"
        style={{ textDecoration: "none" }}
      >
        <div
          style={{
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${T.accent}`,
            color: T.ink,
            padding: "14px 16px",
            borderRadius: 4,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 22 }}>📝</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "-0.01em",
                marginBottom: 2,
              }}
            >
              {t("myJobs.contractChatBanner")}
            </div>
            <div style={{ fontSize: 12, color: T.ink2 }}>
              {t("myJobs.contractChatDesc")}
            </div>
          </div>
          <div style={{ fontSize: 18, color: T.accent }}>→</div>
        </div>
      </Link>

      {/* 타이틀 + 신규 버튼 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: `2px solid ${T.n9}`,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: "-0.025em",
              marginBottom: 4,
              lineHeight: 1.25,
            }}
          >
            {t("myJobs.title")}
          </h1>
          <p
            style={{ color: T.ink3, fontSize: 13, letterSpacing: "-0.01em" }}
          >
            {t("myJobs.jobCount").replace("{count}", jobs.length)}
          </p>
        </div>
        <Link href="/post-job">
          <Btn primary small>
            {t("myJobs.newJobBtn")}
          </Btn>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            background: T.cream,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>📢</div>
          <div
            style={{
              fontWeight: 800,
              color: T.ink,
              marginBottom: 6,
              fontSize: 16,
              letterSpacing: "-0.02em",
            }}
          >
            {t("myJobs.noJobs")}
          </div>
          <p
            style={{ fontSize: 13, color: T.ink2, marginBottom: 16 }}
          >
            {t("myJobs.noJobsDesc")}
          </p>
          <Link href="/post-job">
            <Btn primary>{t("myJobs.postJobBtn")}</Btn>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {jobs.map((j, idx) => (
            <Link
              key={j.id}
              href={`/applicants?jobId=${j.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  padding: "18px 0",
                  borderBottom: `1px solid ${T.border}`,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.cream)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  {/* 인덱스 */}
                  <div
                    style={{
                      minWidth: 24,
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.ink3,
                      paddingTop: 3,
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* 본문 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          color: T.ink,
                          fontSize: 15,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {j.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: 2,
                          background:
                            j.status === "active" ? T.n9 : T.border,
                          color:
                            j.status === "active" ? T.gold : T.ink3,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {t(`myJobs.status.${j.status}`)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.ink2,
                        marginBottom: 10,
                        lineHeight: 1.5,
                      }}
                    >
                      {j.job_type} · {j.address}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: T.accent,
                          letterSpacing: "-0.025em",
                        }}
                      >
                        {j.pay_type} ₩{Number(j.pay_amount).toLocaleString()}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: T.ink2,
                          fontWeight: 600,
                        }}
                      >
                        {t("myJobs.applicantCount")} <strong style={{ color: T.ink }}>{j.applicant_count || 0}{t("myJobs.applicantCountSuffix")}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 새 지원자 알림 챗봇 */}
      <KakaoChatModal
        open={notifChatOpen}
        onClose={() => setNotifChatOpen(false)}
        title="K-ALBA 알림봇"
        botAvatar="🔔"
        steps={notificationSteps}
        onComplete={() => {}}
      />
    </div>
  );
}
