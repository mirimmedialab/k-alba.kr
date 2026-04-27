"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";

/**
 * /partwork — 내 시간제취업 신청 내역
 *
 * 유학생(D-2/D-4)만 접근. 신청 이력과 상태 표시.
 */

const STATUS_INFO = {
  draft:             { label: "작성 중",      color: "#888",   bg: "#F7F5F0", icon: "📝" },
  submitted:         { label: "제출됨",        color: "#1A56F0", bg: "#DBEAFE", icon: "📤" },
  reviewing:         { label: "검토 중",       color: "#A17810", bg: "#FEF3C7", icon: "🔍" },
  documents_needed:  { label: "서류 요청",     color: "#F07820", bg: "#FFEDD5", icon: "📋" },
  approved:          { label: "승인 완료",     color: "#00B37E", bg: "#D1FAE5", icon: "✅" },
  rejected:          { label: "반려",          color: "#E03030", bg: "#FEE2E2", icon: "❌" },
  cancelled:         { label: "취소됨",       color: "#888",    bg: "#F7F5F0", icon: "⊘" },
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

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>로딩 중...</div>;
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
        <Link href="/partwork/apply" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "12px 20px",
            background: T.n9,
            color: T.gold,
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
          }}>
            + 새 신청
          </button>
        </Link>
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
        <div style={{
          padding: "48px 20px",
          textAlign: "center",
          background: T.cream,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>📝</div>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: T.ink,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}>
            아직 신청 내역이 없습니다
          </div>
          <p style={{ fontSize: 13, color: T.ink2, marginBottom: 20, lineHeight: 1.6 }}>
            알바계약 완료 후 시간제취업을 신청해 보세요
          </p>
          <Link href="/partwork/apply" style={{
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
            신청하기 →
          </Link>
        </div>
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
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 2,
                        fontSize: 11,
                        fontWeight: 700,
                        background: st.bg,
                        color: st.color,
                        letterSpacing: "0.02em",
                      }}>
                        {st.icon} {st.label}
                      </span>
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
