"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";
import { Badge, Empty, Button, PageLoading } from "@/components/ui";

/**
 * /partwork — 내 시간제취업 신청 내역 (BI v2)
 *
 * 페르소나 (BI v2 Section 6 — 외국인 유학생):
 *   - D-2/D-4 비자 유학생 (가입자 20%)
 *   - 무드: 진행 추적 — 7단계 상태 시각화
 *
 * 변경점 (BI v2):
 *   - STATUS_INFO 인라인 객체 → <Badge> 시맨틱 ⭐
 *     · draft → neutral (작성 중)
 *     · submitted → info (제출됨)
 *     · reviewing → warning (검토 중)
 *     · documents_needed → warning (서류 요청)
 *     · approved → success (승인 완료)
 *     · rejected → error (반려)
 *     · cancelled → neutral (취소됨)
 *   - 로딩 → <PageLoading> (Step 3-B)
 *   - 빈 상태 → <Empty variant="no-data"> + <Button variant="primary">
 *   - 새 신청 버튼 → <Button variant="primary"> (외국인 페이지 = 활기 코랄)
 *
 * 보존:
 *   - Editorial 헤더 (골드 라인 + UPPERCASE)
 *   - 7단계 상태 아이콘 (📝 📤 🔍 📋 ✅ ❌ ⊘) — Badge에 함께 표시
 *   - 파란 안내 배너 (#DBEAFE) — Important 안내
 *   - 에디토리얼 인덱스 (01, 02, 03...) + 호버 효과
 *   - 신청 정보 표시 (대학/비자/TOPIK/시간/허용시간/날짜)
 */

// 상태별 메타데이터 — Badge variant + icon + label
const STATUS_INFO = {
  draft:             { variant: "neutral", icon: "📝", label: "작성 중" },
  submitted:         { variant: "info",    icon: "📤", label: "제출됨" },
  reviewing:         { variant: "warning", icon: "🔍", label: "검토 중" },
  documents_needed:  { variant: "warning", icon: "📋", label: "서류 요청" },
  approved:          { variant: "success", icon: "✅", label: "승인 완료" },
  rejected:          { variant: "error",   icon: "❌", label: "반려" },
  cancelled:         { variant: "neutral", icon: "⊘",  label: "취소됨" },
};

export default function PartWorkIndexPage() {
  const router = useRouter();
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

  // Step 3-B PageLoading
  if (loading) {
    return <PageLoading message="잠시만 기다려주세요" minHeight={400} />;
  }

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        PartWork · 시간제취업 신청
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
            내 신청 내역 {applications.length}건
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.6 }}>
            D-2/D-4 비자 유학생을 위한 국제처 시간제취업 신청 관리
          </p>
        </div>
        {/* 새 신청 — Step 3-A Button (외국인 페이지 = 활기 코랄) */}
        <Button variant="primary" href="/partwork/apply" size="md">
          + 새 신청
        </Button>
      </div>

      {/* 안내 배너 (info 색상 — 그대로 유지) */}
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
          📘 Important · 꼭 확인하세요
        </div>
        <div style={{ fontSize: 12, color: "#1E40AF", lineHeight: 1.7 }}>
          • 알바계약서 완료 후에만 신청 가능합니다<br />
          • D-4 비자는 입국 후 <strong>6개월 경과</strong>해야 신청할 수 있습니다<br />
          • 교육부 <strong>인증대학 재학생</strong>만 대상입니다<br />
          • 신청 후 국제처 담당자가 <strong>24시간 내</strong> 확인합니다
        </div>
      </div>

      {applications.length === 0 ? (
        // Step 3-C Empty + 활기 코랄 액션
        <Empty
          variant="no-data"
          icon="📝"
          title="아직 신청 내역이 없습니다"
          description="알바계약 완료 후 시간제취업을 신청해 보세요"
          action={
            <Button variant="primary" href="/partwork/apply">
              신청하기 →
            </Button>
          }
        />
      ) : (
        <div>
          {applications.map((app, idx) => {
            const st = STATUS_INFO[app.status] || STATUS_INFO.submitted;
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
                        {app.employer_name}
                      </span>
                      {/* 상태 배지 — Step 3-A Badge 시맨틱 + 아이콘 */}
                      <Badge variant={st.variant} size="sm" icon={st.icon}>
                        {st.label}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13, color: T.ink2, marginBottom: 6 }}>
                      {app.university_name} · {app.visa} · TOPIK {app.topik_level === 0 ? "없음" : `${app.topik_level}급`}
                    </div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: T.ink3 }}>
                      <span>주 {app.weekly_hours}시간</span>
                      <span>·</span>
                      <span>허용 {app.validation_max_hours == null ? "무제한" : `${app.validation_max_hours}h`}</span>
                      <span>·</span>
                      <span>
                        {new Date(app.submitted_at || app.created_at).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>

                  {/* 화살표 */}
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
