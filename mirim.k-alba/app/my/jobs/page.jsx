"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getMyJobs } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { ListPageSkel } from "@/components/Wireframe";
import { Button, Badge, Empty } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * /my/jobs 사장님 메인 페이지 (BI v2)
 *
 * 페르소나 (BI v2 Section 6 — 사장님 페이지):
 *   - 무드: 신뢰·전문성 — 차분한 코랄 + 골드 액센트
 *   - CTA: 진지한 톤 ("새 공고 등록" — 코랄 다크)
 *
 * 변경점 (BI v2):
 *   - Btn, Card (UI.jsx 구버전) → Button, Empty (Step 3-A/C)
 *   - 신규 공고 등록 버튼 → Button variant="primaryDark" (사장님 차분 코랄)
 *   - 빈 상태 → <Empty variant="no-data"> + Button (Step 3-C)
 *   - 상태 배지(active/closed) → <Badge variant="success/neutral">
 *
 * 보존:
 *   - 에디토리얼 인덱스 (01, 02, 03...) + 호버 효과
 *   - ListPageSkel 로딩 (스켈레톤)
 *   - DEMO_JOBS fallback
 *   - 다국어 (useT)
 */

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
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      const data = await getMyJobs(u.id);
      if (data && data.length > 0) setJobs(data);
      setLoading(false);
    });
  }, [router]);

  if (loading) return <ListPageSkel maxWidth={820} showAction rows={3} />;

  // ───────── 데스크탑(웹) 전용 레이아웃: 넓은 컨테이너 + 2열 카드 그리드 ─────────
  if (isDesktop) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 28px 64px" }}>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("myJobs.header")}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, paddingBottom: 16, borderBottom: `2px solid ${T.n9}` }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 4, lineHeight: 1.2 }}>
              {t("myJobs.title")}
            </h1>
            <p style={{ color: T.ink3, fontSize: 13, letterSpacing: "-0.01em" }}>
              {t("myJobs.jobCount").replace("{count}", jobs.length)}
            </p>
          </div>
          <Button variant="primaryDark" href="/jobs/post" size="md">{t("myJobs.newJobBtn")}</Button>
        </div>

        {jobs.length === 0 ? (
          <Empty
            variant="no-data"
            icon="📢"
            title={t("myJobs.noJobs")}
            description={t("myJobs.noJobsDesc")}
            action={<Button variant="primaryDark" href="/jobs/post">{t("myJobs.postJobBtn")}</Button>}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {jobs.map((j) => (
              <Link key={j.id} href={`/applicants?jobId=${j.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{ border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", background: T.paper, height: "100%", boxSizing: "border-box", transition: "box-shadow 0.15s, border-color 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(10,22,40,0.08)"; e.currentTarget.style.borderColor = T.ink3; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = T.border; }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</span>
                    <Badge variant={j.status === "active" ? "success" : "neutral"} size="sm">{t(`myJobs.status.${j.status}`)}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: T.ink2, marginBottom: 12 }}>{j.job_type} · {j.address}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: T.accent, letterSpacing: "-0.025em" }}>{j.pay_type} ₩{Number(j.pay_amount).toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>{t("myJobs.applicantCount")} <strong style={{ color: T.ink }}>{j.applicant_count || 0}{t("myJobs.applicantCountSuffix")}</strong></span>
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
      {/* Editorial 헤더 (사장님 페이지 = 골드 라인) */}
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

      {/* 타이틀 + 신규 버튼 — Button variant="primaryDark" (사장님 차분 코랄) */}
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
        <Button variant="primaryDark" href="/jobs/post" size="sm">
          {t("myJobs.newJobBtn")}
        </Button>
      </div>

      {jobs.length === 0 ? (
        // Step 3-C Empty 컴포넌트 + 골드 액센트 버튼
        <Empty
          variant="no-data"
          icon="📢"
          title={t("myJobs.noJobs")}
          description={t("myJobs.noJobsDesc")}
          action={
            <Button variant="primaryDark" href="/jobs/post">
              {t("myJobs.postJobBtn")}
            </Button>
          }
        />
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
                      {/* 상태 배지 — Step 3-A Badge (active=success, closed=neutral) */}
                      <Badge
                        variant={j.status === "active" ? "success" : "neutral"}
                        style_={j.status === "active" ? "soft" : "soft"}
                        size="sm"
                      >
                        {t(`myJobs.status.${j.status}`)}
                      </Badge>
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
    </div>
  );
}
