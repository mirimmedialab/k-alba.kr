"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getMyJobs, getProfile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { ListPageSkel } from "@/components/Wireframe";
import { Button, Badge, Empty, PageLoading } from "@/components/ui";
import BusinessVerify from "@/components/ui/BusinessVerify";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * /my/jobs 사장님 메인 페이지
 *
 * - 등록한 공고 목록 / 빈 상태
 * - 미인증 사장님: "새 공고"/"공고 등록하기" 클릭 시 구분선 아래에 사업자 인증을
 *   인라인으로 노출(데스크탑). 인증 완료 후 공고 등록으로 이동.
 *   (모바일은 기존대로 /jobs/post 로 이동 — 레이아웃 보존)
 */
export default function MyJobsPage() {
  const router = useRouter();
  const t = useT();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showVerify, setShowVerify] = useState(false);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      setUserId(u.id);
      const [data, prof] = await Promise.all([getMyJobs(u.id), getProfile(u.id)]);
      setJobs(data || []);
      setVerified(!!prof?.verified);
      setLoading(false);
    });
  }, [router]);

  // 새 공고/공고 등록하기: 인증된 사장님은 작성으로, 미인증은 인라인 인증 노출(데스크탑)
  const handleNewJob = () => {
    if (verified) router.push("/jobs/post");
    else setShowVerify(true);
  };

  if (loading) return isDesktop ? <PageLoading message={t("common.pleaseWait")} minHeight={400} /> : <ListPageSkel maxWidth={820} showAction rows={3} />;

  // ───────── 데스크탑(웹) 전용 레이아웃 ─────────
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
          <Button variant="primaryDark" onClick={handleNewJob} size="md">{t("myJobs.newJobBtn")}</Button>
        </div>

        {showVerify && !verified ? (
          <div style={{ border: `1.5px dashed ${T.borderStrong}`, borderRadius: 12, padding: "34px 28px" }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 8, letterSpacing: "-0.02em" }}>
                {t("postJob.verifyGateTitle", null, "사업자 인증이 필요해요")}
              </div>
              <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6 }}>
                {t("postJob.verifyGateDesc", null, "최초 1회만 사업자 인증을 하면 공고를 등록할 수 있어요.")}
              </p>
            </div>
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <BusinessVerify
                userId={userId}
                bare
                horizontal
                onVerified={() => { setVerified(true); setShowVerify(false); router.push("/jobs/post"); }}
              />
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <Empty
            variant="no-data"
            icon="📢"
            title={t("myJobs.noJobs")}
            action={<Button variant="primaryDark" onClick={handleNewJob}>{t("myJobs.postJobBtn")}</Button>}
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

  // ───────── 모바일 레이아웃 (기존 유지) ─────────
  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        {t("myJobs.header")}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${T.n9}` }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 4, lineHeight: 1.25 }}>
            {t("myJobs.title")}
          </h1>
          <p style={{ color: T.ink3, fontSize: 13, letterSpacing: "-0.01em" }}>
            {t("myJobs.jobCount").replace("{count}", jobs.length)}
          </p>
        </div>
        <Button variant="primaryDark" href="/jobs/post" size="sm">
          {t("myJobs.newJobBtn")}
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Empty
          variant="no-data"
          icon="📢"
          title={t("myJobs.noJobs")}
          action={
            <Button variant="primaryDark" href="/jobs/post">
              {t("myJobs.postJobBtn")}
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {jobs.map((j, idx) => (
            <Link key={j.id} href={`/applicants?jobId=${j.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{ padding: "18px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ minWidth: 24, fontSize: 12, fontWeight: 700, color: T.ink3, paddingTop: 3 }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, color: T.ink, fontSize: 15, letterSpacing: "-0.02em" }}>{j.title}</span>
                      <Badge variant={j.status === "active" ? "success" : "neutral"} style_={j.status === "active" ? "soft" : "soft"} size="sm">
                        {t(`myJobs.status.${j.status}`)}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 10, lineHeight: 1.5 }}>
                      {j.job_type} · {j.address}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: T.accent, letterSpacing: "-0.025em" }}>
                        {j.pay_type} ₩{Number(j.pay_amount).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>
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
