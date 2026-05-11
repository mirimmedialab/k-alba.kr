"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { Badge, Empty, Button, PageLoading } from "@/components/ui";

/**
 * /partwork — 내 시간제취업 신청 내역 (BI v2 + i18n)
 *
 * 페르소나: D-2/D-4 비자 유학생 — 외국인 = 7개 언어 지원 필수
 *
 * i18n 변경점:
 *   - STATUS_INFO의 label은 t("partwork.status.{key}")로 동적 조회
 *   - 모든 정적 텍스트 → t()
 *   - 변수 보간: t("partwork.weeklyHours", { hours: app.weekly_hours })
 *
 * 보존:
 *   - Badge 시맨틱 (variant, icon)
 *   - Editorial 골드 헤더
 *   - 7단계 상태 시각화
 */

// 변수 치환 헬퍼 (간단한 {key} 보간)
function fmt(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// Badge variant + icon (label은 i18n으로 분리)
const STATUS_META = {
  draft:             { variant: "neutral", icon: "📝" },
  submitted:         { variant: "info",    icon: "📤" },
  reviewing:         { variant: "warning", icon: "🔍" },
  documents_needed:  { variant: "warning", icon: "📋" },
  approved:          { variant: "success", icon: "✅" },
  rejected:          { variant: "error",   icon: "❌" },
  cancelled:         { variant: "neutral", icon: "⊘" },
};

export default function PartWorkIndexPage() {
  const router = useRouter();
  const t = useT();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }
      if (supabase) {
        const { data } = await supabase
          .from("partwork_applications")
          .select("*")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false });
        setApplications(data || []);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <PageLoading message={t("partwork.loading")} minHeight={400} />;
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {t("partwork.title")}
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 24,
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: T.ink,
            letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
          }}>
            {fmt(t("partwork.myApplicationsHeading"), { count: applications.length })}
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.6 }}>
            {t("partwork.myApplicationsSub")}
          </p>
        </div>
        <Button variant="primary" href="/partwork/apply" size="md">
          {t("partwork.newApplication")}
        </Button>
      </div>

      {/* 안내 배너 */}
      <div style={{
        padding: 16,
        background: "#DBEAFE",
        borderLeft: "3px solid #1A56F0",
        borderRadius: "0 4px 4px 0",
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#1E40AF",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          {t("partwork.importantTitle")}
        </div>
        <div style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.7 }}>
          • {t("partwork.importantBullet1")}<br />
          • <span dangerouslySetInnerHTML={{ __html: t("partwork.importantBullet2_html") }} /><br />
          • <span dangerouslySetInnerHTML={{ __html: t("partwork.importantBullet3_html") }} /><br />
          • <span dangerouslySetInnerHTML={{ __html: t("partwork.importantBullet4_html") }} />
        </div>
      </div>

      {applications.length === 0 ? (
        <Empty
          variant="no-data"
          icon="📝"
          title={t("partwork.emptyTitle")}
          description={t("partwork.emptyDescription")}
          action={
            <Button variant="primary" href="/partwork/apply">
              {t("partwork.newApplicationLong")}
            </Button>
          }
        />
      ) : (
        <div>
          {applications.map((app, idx) => {
            const meta = STATUS_META[app.status] || STATUS_META.submitted;
            const statusLabel = t(`partwork.status.${app.status}`) || t("partwork.status.submitted");
            return (
              <Link
                key={app.id}
                href={`/partwork/${app.id}`}
                style={{ textDecoration: "none" }}
              >
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
                  <div style={{
                    minWidth: 24,
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.ink3,
                    paddingTop: 3,
                  }}>
                    {String(idx + 1).padStart(2, "0")}
                  </div>

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
                        {app.employer_name}
                      </span>
                      <Badge variant={meta.variant} size="sm" icon={meta.icon}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 6 }}>
                      {app.university_name} · {app.visa} · TOPIK{" "}
                      {app.topik_level === 0
                        ? t("partwork.topikNone")
                        : `${app.topik_level}${t("partwork.topikSuffix")}`}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: T.ink3 }}>
                      <span>{fmt(t("partwork.weeklyHours"), { hours: app.weekly_hours })}</span>
                      <span>·</span>
                      <span>
                        {app.validation_max_hours == null
                          ? t("partwork.allowedUnlimited")
                          : fmt(t("partwork.allowedHours"), { hours: app.validation_max_hours })}
                      </span>
                      <span>·</span>
                      <span>
                        {new Date(app.submitted_at || app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: 16, color: T.ink3, flexShrink: 0, paddingTop: 4 }}>
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
