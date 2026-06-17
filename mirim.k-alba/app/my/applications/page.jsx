"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getMyApplications } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { ListPageSkel } from "@/components/Wireframe";
import { Badge, Empty, Button } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * /my/applications 지원 추적 (BI v2)
 *
 * 페르소나 (BI v2 Section 6 — 알바생):
 *   - 외국인 알바생이 자신의 지원 내역을 추적
 *   - 무드: 기대·확인 — 활기찬 코랄 (사장님 페이지의 차분 코랄과 구분)
 *
 * 변경점 (BI v2):
 *   - 인라인 status 배지 → <Badge> 시맨틱 ⭐
 *     · pending → warning (검토중)
 *     · accepted → success (합격)
 *     · rejected → error (거절)
 *   - 빈 상태 → <Empty variant="no-data"> (Step 3-C)
 *   - 인라인 Link 버튼 → <Button variant="primary"> (알바생 = 활기 코랄)
 *   - UI.jsx의 Card import 제거 (실제로 사용 안 됨)
 *
 * 보존:
 *   - Editorial 헤더 (골드 라인 + UPPERCASE 라벨)
 *   - 에디토리얼 인덱스 번호 (01, 02, 03...) + 호버 효과
 *   - 지원 통계 요약 (검토중 N건 · 합격 N건)
 *   - ListPageSkel 로딩 (스켈레톤)
 *   - 다국어 (useT)
 */
export default function MyApplicationsPage() {
  const router = useRouter();
  const t = useT();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

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

  // status → Badge variant 매핑
  const statusVariant = {
    pending: "warning",   // 검토중 — 주황 (기다림)
    accepted: "success",  // 합격 — 민트 (성공)
    rejected: "error",    // 거절 — 빨강
  };

  // ───────── 데스크탑(웹) 전용 레이아웃: 넓은 컨테이너 + 2열 카드 그리드 ─────────
  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 28px 64px" }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("myApplications.header")}
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.2 }}>
          {t("myApplications.title").replace("{count}", applications.length)}
        </h1>
        <p style={{ color: T.ink2, fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
          {pendingCount > 0 && t("myApplications.reviewingCount").replace("{count}", pendingCount)}
          {pendingCount > 0 && acceptedCount > 0 && " · "}
          {acceptedCount > 0 && t("myApplications.acceptedCount").replace("{count}", acceptedCount)}
          {pendingCount === 0 && acceptedCount === 0 && t("myApplications.statusOverview")}
        </p>

        {applications.length === 0 ? (
          <Empty
            variant="no-data"
            icon="📋"
            title={t("myApplications.noApplications")}
            description={t("myApplications.noApplicationsDesc")}
            action={<Button variant="primary" href="/jobs">{t("myApplications.findJobsBtn")}</Button>}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {applications.map((app) => (
              <Link key={app.id} href={`/jobs/${app.job_id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", background: T.paper, transition: "box-shadow 0.15s, border-color 0.15s", height: "100%", boxSizing: "border-box" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(10,22,40,0.08)"; e.currentTarget.style.borderColor = T.ink3; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = T.border; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {app.job?.title || t("jobs.title")}
                    </span>
                    <Badge variant={statusVariant[app.status] || "neutral"} size="sm">
                      {t(`myApplications.status.${app.status}`)}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 6 }}>
                    {app.job?.company_name || t("myApplications.companyUnknown")}
                  </div>
                  <div style={{ fontSize: 11.5, color: T.ink3 }}>
                    {t("myApplications.appliedDate")}: {new Date(app.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {t("myApplications.header")}
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        {t("myApplications.title").replace("{count}", applications.length)}
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
        {pendingCount > 0 && t("myApplications.reviewingCount").replace("{count}", pendingCount)}
        {pendingCount > 0 && acceptedCount > 0 && " · "}
        {acceptedCount > 0 && t("myApplications.acceptedCount").replace("{count}", acceptedCount)}
        {pendingCount === 0 && acceptedCount === 0 && t("myApplications.statusOverview")}
      </p>

      {applications.length === 0 ? (
        // Step 3-C Empty + 알바생 활기 코랄 액션
        <Empty
          variant="no-data"
          icon="📋"
          title={t("myApplications.noApplications")}
          description={t("myApplications.noApplicationsDesc")}
          action={
            <Button variant="primary" href="/jobs">
              {t("myApplications.findJobsBtn")}
            </Button>
          }
        />
      ) : (
        <div>
          {applications.map((app, idx) => (
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
                      {app.job?.title || t("jobs.title")}
                    </span>
                    {/* 상태 배지 — Step 3-A Badge 시맨틱 ⭐
                        pending=warning(검토중), accepted=success(합격), rejected=error(거절) */}
                    <Badge
                      variant={statusVariant[app.status] || "neutral"}
                      size="sm"
                    >
                      {t(`myApplications.status.${app.status}`)}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 4 }}>
                    {app.job?.company_name || t("myApplications.companyUnknown")}
                  </div>
                  <div style={{ fontSize: 11, color: T.ink3 }}>
                    {t("myApplications.appliedDate")}: {new Date(app.created_at).toLocaleDateString()}
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
          ))}
        </div>
      )}
    </div>
  );
}
