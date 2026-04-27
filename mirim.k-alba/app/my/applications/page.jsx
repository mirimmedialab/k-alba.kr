"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Card } from "@/components/UI";
import { getCurrentUser, getMyApplications } from "@/lib/supabase";
import { ListPageSkel } from "@/components/Wireframe";

const STATUS_INFO = {
  pending: { label: "검토 중", color: "#A17810", bg: "#F7F5F0" },
  accepted: { label: "합격", color: "#2A7A4A", bg: "#E8F5EC" },
  rejected: { label: "불합격", color: "#A31919", bg: "#FEE" },
};

export default function MyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const apps = await getMyApplications(u.id);
      setApplications(apps);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <ListPageSkel maxWidth={820} rows={3} />;

  const pendingCount = applications.filter(a => a.status === "pending").length;
  const acceptedCount = applications.filter(a => a.status === "accepted").length;

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Applications · 내 지원 내역
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        총 {applications.length}건 지원
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        {pendingCount > 0 && `${pendingCount}건 검토 중`}
        {pendingCount > 0 && acceptedCount > 0 && " · "}
        {acceptedCount > 0 && `${acceptedCount}건 합격`}
        {pendingCount === 0 && acceptedCount === 0 && "지원 상태를 한눈에 확인하세요"}
      </p>

      {applications.length === 0 ? (
        <div style={{
          padding: "48px 20px",
          textAlign: "center",
          background: T.cream,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>📋</div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: T.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            아직 지원한 알바가 없습니다
          </div>
          <p style={{ fontSize: 13, color: T.ink2, marginBottom: 20, lineHeight: 1.6 }}>
            내 비자에 맞는 공고를 확인해 보세요
          </p>
          <Link href="/jobs" style={{
            display: "inline-block",
            padding: "12px 24px",
            background: T.n9,
            color: T.gold,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
            borderRadius: 4,
            letterSpacing: "-0.01em",
          }}>
            알바 찾기 →
          </Link>
        </div>
      ) : (
        <div>
          {applications.map((app, idx) => {
            const st = STATUS_INFO[app.status] || STATUS_INFO.pending;
            return (
              <Link key={app.id} href={`/jobs/${app.job_id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    padding: "18px 0",
                    borderBottom: `1px solid ${T.border}`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* 인덱스 */}
                  <div style={{
                    minWidth: 24,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.ink3,
                    paddingTop: 3,
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* 본문 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: "wrap",
                    }}>
                      <span style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: T.ink,
                        letterSpacing: "-0.02em",
                      }}>
                        {app.job?.title || "알바"}
                      </span>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 700,
                        background: st.bg,
                        color: st.color,
                        letterSpacing: "0.02em",
                      }}>
                        {st.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>
                      {app.job?.company_name || "회사명 미입력"}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink3 }}>
                      지원일: {new Date(app.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>

                  {/* 화살표 */}
                  <div style={{
                    fontSize: 16,
                    color: T.ink3,
                    flexShrink: 0,
                    paddingTop: 4,
                  }}>
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
