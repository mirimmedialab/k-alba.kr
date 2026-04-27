"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";

/**
 * /admin — 관리자 대시보드
 *
 * 보호: user_metadata.role === "admin" 만 접근 가능
 *
 * 섹션:
 *   1. 실시간 지표 (유저/공고/계약서)
 *   2. 데이터 동기화 상태 (WorkNet/AgriWork)
 *   3. 이메일 캠페인 현황
 *   4. 최근 등록 / 이슈 알림
 */
export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      // 관리자 권한 체크
      const role = user.user_metadata?.role || user.app_metadata?.role;
      if (role !== "admin") {
        router.push("/");
        return;
      }
      setAuthorized(true);
      await loadDashboard();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    if (!supabase) return;

    // 통계 (병렬)
    const [
      usersResult,
      jobsResult,
      contractsResult,
      applicationsResult,
      logsResult,
      campaignsResult,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id, status", { count: "exact" }),
      supabase.from("contracts").select("id, status", { count: "exact" }),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(5),
      supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const activeJobs = (jobsResult.data || []).filter(j => j.status === "active").length;
    const completedContracts = (contractsResult.data || []).filter(c => c.status === "completed").length;

    setStats({
      users: usersResult.count || 0,
      jobs: jobsResult.count || 0,
      activeJobs,
      contracts: contractsResult.count || 0,
      completedContracts,
      applications: applicationsResult.count || 0,
    });

    setSyncLogs(logsResult.data || []);
    setCampaigns(campaignsResult.data || []);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>
        로딩 중...
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div style={{ padding: "32px 20px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Admin · 관리자 대시보드
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        K-ALBA 운영 현황
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
        전체 서비스 지표와 데이터 동기화 상태를 확인할 수 있습니다.
      </p>

      {/* 실시간 지표 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 16,
        marginBottom: 40,
      }}>
        <MetricCard label="전체 회원" value={stats?.users} suffix="명" />
        <MetricCard label="활성 공고" value={stats?.activeJobs} total={stats?.jobs} suffix="개" />
        <MetricCard label="지원 건수" value={stats?.applications} suffix="건" />
        <MetricCard label="완료 계약" value={stats?.completedContracts} total={stats?.contracts} suffix="건" />
      </div>

      {/* 관리 메뉴 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
        marginBottom: 40,
      }}>
        <AdminMenuCard
          title="이메일 캠페인"
          desc="B2B 아웃리치 캠페인 생성·발송·지표 확인"
          href="/admin/campaigns"
          icon="📧"
        />
        <AdminMenuCard
          title="이메일 연락처"
          desc="수집된 사업자 이메일 + 동의 상태 관리"
          href="/admin/contacts"
          icon="📇"
        />
        <AdminMenuCard
          title="공고 데이터 동기화"
          desc="WorkNet · AgriWork 크롤링 상태 점검"
          href="/admin/sync"
          icon="🔄"
        />
        <AdminMenuCard
          title="사용자 관리"
          desc="회원 조회 · 비자 통계 · 차단 관리"
          href="/admin/users"
          icon="👥"
        />
      </div>

      {/* 데이터 동기화 상태 */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 14 }} />
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
        }}>
          Data Sync · 데이터 동기화
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 16 }}>
          최근 동기화 로그
        </h2>

        {syncLogs.length === 0 ? (
          <div style={{
            padding: "24px 20px",
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            fontSize: 13,
            color: T.ink3,
            textAlign: "center",
          }}>
            아직 동기화 로그가 없습니다. 스케줄러를 확인해 주세요.
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: "hidden" }}>
            {syncLogs.map((log, i) => (
              <div key={log.id} style={{
                padding: "14px 16px",
                borderBottom: i < syncLogs.length - 1 ? `1px solid ${T.border}` : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
                    {log.source} · {log.status}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
                    {new Date(log.started_at).toLocaleString("ko-KR")}
                    {log.completed_at && ` ~ ${new Date(log.completed_at).toLocaleTimeString("ko-KR")}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: T.ink2 }}>
                    수집 <strong style={{ color: T.ink }}>{log.items_fetched || 0}</strong>
                  </span>
                  <span style={{ color: T.green }}>
                    신규 <strong>{log.items_new || 0}</strong>
                  </span>
                  {log.items_failed > 0 && (
                    <span style={{ color: T.accent }}>
                      실패 <strong>{log.items_failed}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 이메일 캠페인 */}
      <section style={{ marginBottom: 40 }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 14 }} />
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
        }}>
          Email Campaigns · 이메일 캠페인
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>
            최근 캠페인
          </h2>
          <Link href="/admin/campaigns/new" style={{ textDecoration: "none" }}>
            <button style={{
              padding: "8px 16px",
              background: T.n9,
              color: T.gold,
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
            }}>
              + 새 캠페인
            </button>
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div style={{
            padding: "24px 20px",
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            fontSize: 13,
            color: T.ink3,
            textAlign: "center",
          }}>
            아직 캠페인이 없습니다
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: "hidden" }}>
            {campaigns.map((c, i) => (
              <Link key={c.id} href={`/admin/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "14px 16px",
                  borderBottom: i < campaigns.length - 1 ? `1px solid ${T.border}` : "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>
                      {c.status} · {new Date(c.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: T.ink2 }}>
                      발송 <strong style={{ color: T.ink }}>{c.sent_count || 0}</strong>/{c.total_targets || 0}
                    </span>
                    {c.opened_count > 0 && (
                      <span style={{ color: T.green }}>
                        개봉 <strong>{c.opened_count}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, total, suffix = "" }) {
  return (
    <div style={{
      padding: 20,
      background: T.paper,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${T.gold}`,
      borderRadius: 4,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: T.ink3,
        letterSpacing: "-0.01em",
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 30,
        fontWeight: 800,
        color: T.ink,
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}>
        {value != null ? value.toLocaleString() : "—"}
        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginLeft: 4 }}>
          {suffix}
        </span>
      </div>
      {total != null && total !== value && (
        <div style={{ fontSize: 11, color: T.ink3, marginTop: 4 }}>
          전체 {total.toLocaleString()}개 중
        </div>
      )}
    </div>
  );
}

function AdminMenuCard({ title, desc, href, icon }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div
        style={{
          padding: 20,
          background: T.paper,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = T.gold;
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = T.border;
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{
          fontSize: 24,
          marginBottom: 10,
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: T.ink,
          marginBottom: 4,
          letterSpacing: "-0.02em",
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5 }}>
          {desc}
        </div>
      </div>
    </Link>
  );
}
