"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";

/**
 * /admin/campaigns — 이메일 캠페인 관리 목록
 *
 * 기능:
 *   - 전체 캠페인 테이블 조회
 *   - 상태별 필터
 *   - 발송 지표 (발송/개봉/클릭)
 *   - 새 캠페인 생성 버튼
 */
export default function AdminCampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const role = user.user_metadata?.role || user.app_metadata?.role;
      if (role !== "admin") {
        router.push("/");
        return;
      }
      setAuthorized(true);
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns(data || []);
  };

  const filtered = filter === "all"
    ? campaigns
    : campaigns.filter(c => c.status === filter);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>로딩 중...</div>;
  if (!authorized) return null;

  return (
    <div style={{ padding: "32px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/admin" style={{
        color: T.ink3,
        fontSize: 12,
        marginBottom: 18,
        display: "inline-block",
        textDecoration: "none",
        letterSpacing: "-0.01em",
      }}>
        ← 관리자 대시보드
      </Link>

      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Email Campaigns · 이메일 캠페인
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 800, color: T.ink,
            letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
          }}>
            캠페인 {campaigns.length}개
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, lineHeight: 1.6 }}>
            B2B 이메일 아웃리치 캠페인을 관리합니다
          </p>
        </div>
        <Link href="/admin/campaigns/new" style={{ textDecoration: "none" }}>
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
            + 새 캠페인
          </button>
        </Link>
      </div>

      {/* 상태 필터 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {[
          ["all", "전체", campaigns.length],
          ["draft", "초안", campaigns.filter(c => c.status === "draft").length],
          ["scheduled", "예약됨", campaigns.filter(c => c.status === "scheduled").length],
          ["sending", "발송중", campaigns.filter(c => c.status === "sending").length],
          ["sent", "완료", campaigns.filter(c => c.status === "sent").length],
        ].map(([v, l, n]) => {
          const active = filter === v;
          return (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? T.ink : T.ink3,
                borderBottom: active ? `2px solid ${T.accent}` : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              {l} <span style={{ color: T.ink3, fontWeight: 600 }}>({n})</span>
            </button>
          );
        })}
      </div>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <div style={{
          padding: "48px 20px",
          background: T.cream,
          border: `1px solid ${T.border}`,
          borderRadius: 4,
          textAlign: "center",
          color: T.ink3,
          fontSize: 14,
        }}>
          캠페인이 없습니다
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: "hidden" }}>
          {/* 헤더 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 120px 100px 100px 80px 120px",
            gap: 12,
            padding: "12px 16px",
            background: T.cream,
            borderBottom: `1px solid ${T.border}`,
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>
            <div>캠페인명</div>
            <div>상태</div>
            <div style={{ textAlign: "right" }}>발송</div>
            <div style={{ textAlign: "right" }}>개봉</div>
            <div style={{ textAlign: "right" }}>개봉율</div>
            <div style={{ textAlign: "right" }}>생성일</div>
          </div>

          {/* 행 */}
          {filtered.map((c, i) => {
            const openRate = c.sent_count > 0
              ? ((c.opened_count || 0) / c.sent_count * 100).toFixed(0)
              : "—";
            return (
              <Link key={c.id} href={`/admin/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 120px 100px 100px 80px 120px",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none",
                  fontSize: 13,
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: T.ink, marginBottom: 2, letterSpacing: "-0.01em" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.ink3 }}>
                      {c.subject.slice(0, 50)}{c.subject.length > 50 ? "..." : ""}
                    </div>
                  </div>
                  <div>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 2,
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        c.status === "sent" ? "#E8F5EC" :
                        c.status === "sending" ? T.accentBg :
                        T.cream,
                      color:
                        c.status === "sent" ? T.green :
                        c.status === "sending" ? T.accent :
                        T.ink2,
                      letterSpacing: "0.02em",
                    }}>
                      {c.status === "draft" ? "초안" :
                       c.status === "scheduled" ? "예약" :
                       c.status === "sending" ? "발송중" :
                       c.status === "sent" ? "완료" :
                       c.status}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", color: T.ink, fontWeight: 600 }}>
                    {c.sent_count || 0}/{c.total_targets || 0}
                  </div>
                  <div style={{ textAlign: "right", color: T.ink }}>
                    {c.opened_count || 0}
                  </div>
                  <div style={{ textAlign: "right", color: c.opened_count > 0 ? T.green : T.ink3, fontWeight: 700 }}>
                    {openRate}{openRate !== "—" ? "%" : ""}
                  </div>
                  <div style={{ textAlign: "right", color: T.ink3, fontSize: 11 }}>
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 하단 가이드 */}
      <div style={{
        marginTop: 32,
        padding: 20,
        background: T.cream,
        borderLeft: `3px solid ${T.gold}`,
        borderRadius: "0 4px 4px 0",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
        }}>
          ⚠️ Legal Notice · 법적 준수
        </div>
        <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.7 }}>
          • 모든 캠페인 제목에 <strong>"(광고)"</strong> 자동 추가됨 (정보통신망법 제50조)<br />
          • 본문 하단에 수신자 정보 + 거부 링크 자동 삽입됨<br />
          • 공개된 이메일(워크넷/AgriWork 공고)만 발송 · 수신거부자는 자동 제외<br />
          • 야간(23:00~08:00) 발송 자동 차단
        </div>
      </div>
    </div>
  );
}
