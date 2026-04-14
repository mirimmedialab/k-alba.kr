"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Btn, Card } from "@/components/UI";
import { getCurrentUser, getMyJobs } from "@/lib/supabase";
import { KakaoChatModal } from "@/components/KakaoChatModal";

const DEMO_JOBS = [
  { id: 1, title: "카페 바리스타", job_type: "카페", pay_type: "시급", pay_amount: 12000, address: "서울 강남구 테헤란로 152", applicant_count: 12, status: "active", created_at: "2026-04-10" },
  { id: 2, title: "딸기 수확 작업자", job_type: "농업", pay_type: "일급", pay_amount: 150000, address: "충남 논산시 강경읍", applicant_count: 28, status: "active", created_at: "2026-04-08" },
  { id: 3, title: "한식당 서빙", job_type: "식당", pay_type: "시급", pay_amount: 11500, address: "서울 용산구 이태원로 200", applicant_count: 7, status: "closed", created_at: "2026-04-01" },
];

export default function MyJobsPage() {
  const router = useRouter();
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

      // 데모: 페이지 방문 시 새 지원자 알림 챗봇 자동 표시 (1회만)
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

  // 새 지원자 알림 챗봇 단계
  const notificationSteps = [
    {
      type: "bot",
      text: "🔔 새로운 지원자 알림!\n\n방금 카페 바리스타 공고에 새로운 지원이 있어요!",
    },
    {
      type: "bot",
      text:
        "👤 Linh T. (베트남, D-2 비자)\n🎓 서울대학교 어학당\n🗣️ 한국어: 중급\n⭐ K-ALBA 평점: 4.8/5.0\n\n💬 \"성실하게 일하겠습니다! 카페 알바 6개월 경험 있습니다.\"",
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

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto" }}>
      {/* 새 지원자 알림 배너 */}
      <div
        onClick={() => setNotifChatOpen(true)}
        style={{
          background: "#FEE500",
          color: "#1A1A2E",
          padding: "12px 16px",
          borderRadius: 12,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(254,229,0,0.4)",
        }}
      >
        <div style={{ fontSize: 24 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>새로운 지원자 알림 (3건)</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>탭하여 카카오톡 챗봇으로 확인</div>
        </div>
        <div style={{ fontSize: 18 }}>›</div>
      </div>

      {/* 계약서 챗봇 체험 배너 */}
      <Link href="/simulator?mode=boss&job=k1&autostart=1" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.coral}, #FF8A7A)`,
            color: "#fff",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            boxShadow: `0 2px 8px ${T.coral}40`,
          }}
        >
          <div style={{ fontSize: 24 }}>📝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>사장님 계약서 챗봇 체험</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>합격자와 카카오톡으로 계약서 작성 → PDF 다운로드</div>
          </div>
          <div style={{ fontSize: 18 }}>›</div>
        </div>
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>내 채용공고</h2>
          <p style={{ color: T.g500, fontSize: 13 }}>등록한 공고 {jobs.length}건</p>
        </div>
        <Link href="/post-job">
          <Btn primary>+ 새 공고</Btn>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
          <div style={{ fontWeight: 700, color: T.navy, marginBottom: 6 }}>등록한 공고가 없습니다</div>
          <p style={{ fontSize: 13, color: T.g500, marginBottom: 16 }}>카카오톡 챗봇으로 3분만에 등록하세요!</p>
          <Link href="/post-job">
            <Btn primary>공고 등록하기</Btn>
          </Link>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((j) => (
            <Link key={j.id} href={`/applicants?jobId=${j.id}`} style={{ textDecoration: "none" }}>
              <Card>
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{j.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: j.status === "active" ? T.mintL : T.g100, color: j.status === "active" ? "#059669" : T.g500 }}>
                        {j.status === "active" ? "모집 중" : "마감"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: T.g500 }}>{j.job_type} · {j.address}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.g100}` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.coral }}>
                    {j.pay_type} ₩{Number(j.pay_amount).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: T.g700, fontWeight: 600 }}>
                    👥 지원자 {j.applicant_count || 0}명
                  </div>
                </div>
              </Card>
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
