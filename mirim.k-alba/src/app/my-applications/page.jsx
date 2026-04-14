"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { Card } from "@/components/UI";
import { getCurrentUser, getMyApplications } from "@/lib/supabase";

const STATUS_INFO = {
  pending: { label: "검토 중", color: "#F59E0B", bg: "#FEF3C7" },
  accepted: { label: "합격", color: "#059669", bg: "#D1FAE5" },
  rejected: { label: "불합격", color: "#DC2626", bg: "#FEE2E2" },
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

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>로딩 중...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: T.navy, marginBottom: 4 }}>내 지원 내역</h2>
      <p style={{ color: T.g500, fontSize: 13, marginBottom: 20 }}>총 {applications.length}건</p>

      {applications.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 700, color: T.navy, marginBottom: 6 }}>아직 지원한 알바가 없습니다</div>
          <p style={{ fontSize: 13, color: T.g500, marginBottom: 16 }}>지금 바로 알바를 찾아보세요!</p>
          <Link href="/jobs" style={{ display: "inline-block", padding: "10px 20px", borderRadius: 10, background: T.coral, color: "#fff", fontWeight: 700, fontSize: 13 }}>알바 찾기</Link>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {applications.map((app) => {
            const st = STATUS_INFO[app.status] || STATUS_INFO.pending;
            return (
              <Link key={app.id} href={`/jobs/${app.job_id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: T.navy, fontSize: 15 }}>{app.job?.title || "알바"}</div>
                      <div style={{ fontSize: 12, color: T.g500, marginTop: 2 }}>{app.job?.company_name || ""}</div>
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, flexShrink: 0 }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.g500 }}>지원일: {new Date(app.created_at).toLocaleDateString("ko-KR")}</div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
