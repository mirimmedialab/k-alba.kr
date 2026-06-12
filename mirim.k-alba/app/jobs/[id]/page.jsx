"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getJob, applyJob, getCurrentUser, getProfile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { KakaoChatModal } from "@/components/KakaoChatModal";
import KakaoMap from "@/components/KakaoMap";
import RouteCard from "@/components/RouteCard";
import LastTransitCard from "@/components/LastTransitCard";
import { formatDistance, calculateDistanceMeters } from "@/lib/geolocation";
import {
  Button,
  Card,
  CardTitle,
  CardSubtitle,
  VisaBadge,
  PageLoading,
} from "@/components/ui";

/**
 * /jobs/[id] 알바 상세 페이지 (BI v2)
 *
 * 페르소나 (BI v2 Section 6):
 *   - 외국인 알바생 + 유학생 — 결정 직전
 *   - 무드: 결정 직전 — 챗봇 진입 강조
 *
 * 변경점 (BI v2):
 *   - Btn, Card (UI.jsx 구버전) → Button, Card (Step 3-A)
 *   - 인라인 비자 span → <VisaBadge variant="solid"> ⭐
 *     (이전: 모든 비자가 민트색 동일 → 비자별 자동 색상 7종)
 *   - 로딩 → <PageLoading> (Step 3-B)
 *   - T.g500/g700/g100 (구버전) → T.ink3/ink2/border (새 표준)
 *   - botAvatar fallback: 🤖 → 💬 (BI v2: 챗봇 아바타에 🤖 미사용)
 *
 * 보존:
 *   - 카카오톡 챗봇 7단계 지원 흐름 (한국어/비자/만료일/시작일/경험/메시지)
 *   - 카카오 노란 배경 챗봇 진입 카드 (#FEE500)
 *   - 위치 카드 + 경로 카드 + 막차 경고
 *   - 합격 후 시뮬레이터 진입
 *   - 직업별 이모지 (☕ 🌾 등)
 *   - DEMO_JOBS fallback
 *   - 다국어 (useT)
 */

const DEMO_JOBS = {
  "1": { id: 1, icon: "☕", title: "카페 바리스타", company: "블루보틀 강남점", area: "강남구", hours: "주 20시간", pay: 12000, visa: ["D-2", "F-4", "H-2"], korean: "beginner", type: "카페", desc: "강남역 근처 카페에서 바리스타를 모집합니다. 외국인 환영, 기본적인 한국어 가능하면 OK. 커피 제조 및 매장 관리 업무.", days: ["월", "수", "금"], time: "14:00~20:00" },
  "7": { id: 7, icon: "🌾", title: "딸기 수확 작업자", company: "논산 딸기농장", area: "충남 논산", hours: "주 40시간", pay: 150000, visa: ["E-9", "H-2", "F-4"], korean: "none", type: "농업", desc: "딸기 수확, 선별, 포장 작업. 비닐하우스 내 작업 (겨울 따뜻). 숙소 무료, 3끼 식사 제공.", days: ["매일"], time: "06:00~15:00" },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useT();
  const [job, setJob] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    getJob(params.id).then((data) => {
      if (data) {
        // employer.company_name / employer.name 을 평탄화
        setJob({
          ...data,
          company: data.company || data.employer?.company_name || data.employer?.name || "",
          company_name: data.company_name || data.employer?.company_name || "",
          area: data.area || data.sigungu || data.address || "",
          // DB 컬럼(pay_amount/work_hours/job_type 등)을 화면이 쓰는 필드명으로 매핑
          pay: data.pay ?? data.pay_amount ?? 0,
          pay_type: data.pay_type || "시급",
          type: data.type || data.job_type || "",
          hours: data.hours || data.work_hours || "",
          days: data.days || data.work_days || "",
          korean: data.korean || data.korean_level || "",
          visa: data.visa || data.visa_types || [],
          desc: data.desc || data.description || "",
          benefits: data.benefits || "",
          headcount: data.headcount || "",
        });
        // 워크넷 공고: 목록 API 제목이 30자로 잘리고 상세설명이 없음
        // → 상세조회 API로 전체 제목·상세설명·근무시간 보강
        if (data.source_type === "worknet" && data.source_id) {
          const infoSvc = data.raw?.infoSvc || "VALIDATION";
          fetch(
            `/api/jobs/worknet-detail?authNo=${encodeURIComponent(data.source_id)}&infoSvc=${encodeURIComponent(infoSvc)}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d && d.ok) {
                setJob((prev) => ({
                  ...prev,
                  title: d.title || prev.title,
                  company: d.company || prev.company,
                  desc: d.description || prev.desc,
                  hours: d.work_hours || prev.hours,
                  benefits: d.welfare || prev.benefits,
                  headcount: d.headcount || prev.headcount,
                }));
              }
            })
            .catch(() => {});
        }
      }
      setLoaded(true);
    });
    getCurrentUser().then(async (u) => {
      setUser(u);
      if (u) {
        const p = await getProfile(u.id);
        setUserProfile(p);
      }
    });
  }, [params.id]);

  // 카톡 챗봇 단계 정의
  const applySteps = [
    {
      type: "bot",
      text: `안녕하세요! ${user?.user_metadata?.name || "지원자"}님 👋\n${job?.company || ""} ${job?.title || ""} 공고에 지원하시는군요!`,
    },
    {
      type: "bot",
      text: "📋 먼저 몇 가지만 빠르게 확인할게요.\n한국어 수준이 어떻게 되시나요?",
      quickReplies: ["불필요/초급", "초급", "중급", "고급"],
      key: "korean_level",
    },
    {
      type: "bot",
      text: "🛂 비자 종류를 알려주세요.",
      quickReplies: ["D-2 (유학)", "D-4 (어학연수)", "F-2/F-4/F-6", "E-9", "H-2", "기타"],
      key: "visa_type",
    },
    {
      type: "bot",
      text: "📅 비자 만료일이 언제인가요?\n(근무 기간보다 길어야 합니다)",
      input: { type: "date", placeholder: "YYYY-MM-DD" },
      key: "visa_expiry",
    },
    {
      type: "bot",
      text: "🚀 근무 가능한 시작일은 언제인가요?",
      input: { type: "date", placeholder: "YYYY-MM-DD" },
      key: "start_date",
    },
    {
      type: "bot",
      text: "💪 관련 경험이 있으신가요?\n(예: 카페 알바 6개월, 농장 경험 등)",
      input: { type: "text", placeholder: "없으면 '없음'", optional: true },
      key: "experience",
    },
    {
      type: "bot",
      text: "💬 사장님께 전하고 싶은 한 마디 (선택)",
      input: { type: "text", placeholder: "지원 동기, 자기소개 등", optional: true },
      key: "message",
    },
    {
      type: "bot",
      text: (a) =>
        `🎉 지원이 완료되었어요!\n\n✓ ${job.company}에 알림이 발송됩니다\n✓ 사장님이 24시간 내에 K-ALBA 채팅으로 연락드릴 거예요\n\n💡 합격 시 카카오톡 + 이메일로 알림을 받으실 수 있어요!`,
      delay: 1000,
    },
  ];

  const handleApply = async () => {
    const u = await getCurrentUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    setChatOpen(true);
  };

  const handleChatComplete = async (answers) => {
    setLoading(true);
    const fullMessage = [
      `한국어: ${answers.korean_level || "-"}`,
      `비자: ${answers.visa_type || "-"} (만료: ${answers.visa_expiry || "-"})`,
      `시작 가능일: ${answers.start_date || "-"}`,
      `경험: ${answers.experience || "없음"}`,
      answers.message ? `\n💬 ${answers.message}` : "",
    ].join("\n");

    const { error } = await applyJob(params.id, user.id, fullMessage);
    setLoading(false);
    if (!error || String(error.message || "").includes("not configured")) {
      setApplied(true);
    }
  };

  // Step 3-B PageLoading 컴포넌트
  if (!loaded) return <PageLoading message="잠시만 기다려주세요" minHeight={400} />;
  if (!job)
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontSize: 14 }}>
        공고를 찾을 수 없습니다.
      </div>
    );

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <Link href="/jobs" style={{ color: T.ink3, fontSize: 14, marginBottom: 16, display: "inline-block" }}>
        ← {t("jobs.jobList")}
      </Link>

      {/* 공고 헤더 카드 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 40 }}>{job.icon || "💼"}</div>
          <div>
            <CardTitle style={{ fontSize: 20, marginBottom: 2 }}>{job.title}</CardTitle>
            <CardSubtitle>{job.company}</CardSubtitle>
          </div>
        </div>
        {/* 비자 배지 — Step 3-A VisaBadge ⭐ BI v2 핵심 변경
            (이전: 모든 비자가 민트색 동일 → 비자별 자동 색상 7종) */}
        {(job.visa || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {(job.visa || []).map((v) => (
              <VisaBadge key={v} code={v} variant="solid" size="md" />
            ))}
          </div>
        )}
        <div style={{ fontSize: 24, fontWeight: 900, color: T.mint, textAlign: "right" }}>
          ₩{job.pay?.toLocaleString()} / {{ 시급: "시간", 일급: "일", 월급: "월", 연봉: "년" }[job.pay_type] || "시간"}
        </div>
      </Card>

      {/* 근무 조건 카드 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 10 }}>
          {t("jobs.workConditions")}
        </div>
        {[
          ["지역", job.area],
          ["근무", [job.time, job.hours].filter(Boolean).join(" · ") || "-"],
          ["업종", job.type],
          job.headcount && String(job.headcount) !== "1"
            ? ["모집인원", /^\d+$/.test(String(job.headcount)) ? `${job.headcount}명` : job.headcount]
            : null,
          job.benefits ? ["복리후생", job.benefits] : null,
          job.expires_at ? ["마감", String(job.expires_at).slice(0, 10)] : null,
        ]
          .filter(Boolean)
          .map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 13, color: T.ink3, flexShrink: 0 }}>{k}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.navy, textAlign: "right", lineHeight: 1.5 }}>
              {k === "근무"
                ? String(v)
                    .split(/\s*\n\s*|\s{2,}|\s*,\s*/)
                    .map((seg) => seg.trim())
                    .filter(Boolean)
                    .map((line, i) => (
                      <span key={i} style={{ display: "block" }}>{line}</span>
                    ))
                : v}
            </span>
          </div>
        ))}
      </Card>

      {/* 공고 설명 카드 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.navy, marginBottom: 10 }}>
          상세정보
        </div>
        <p style={{ margin: 0, fontSize: 13, color: T.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {String(job.desc || "").replace(/^\s*담당업무\s*[:：]?\s*/, "").trimEnd()}
        </p>
      </Card>

      {/* 원문(워크넷) 보기 */}
      {job.apply_url && (
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            padding: "11px 16px",
            marginBottom: 16,
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.ink2,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          🔗 고용24 원문 보기
        </a>
      )}

      {/* 위치 + 경로 카드 (공고에 좌표 있을 때만) */}
      {job.latitude && job.longitude && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 14 }} />
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.ink3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            Location · 근무지 위치
          </div>

          {/* 지도 */}
          <KakaoMap
            center={{ latitude: job.latitude, longitude: job.longitude }}
            level={4}
            markers={[{
              latitude: job.latitude,
              longitude: job.longitude,
              title: job.company,
              color: T.accent,
            }]}
            userLocation={
              userProfile?.home_latitude && userProfile?.home_longitude
                ? { latitude: userProfile.home_latitude, longitude: userProfile.home_longitude }
                : null
            }
            height={220}
          />

          {/* 주소 + 거리 요약 */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            padding: "12px 14px",
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 6,
            marginTop: 10,
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
              📍 {job.address_road || job.address || job.area}
            </div>
            {userProfile?.home_latitude && userProfile?.home_longitude && (
              <div style={{ fontSize: 12, color: T.ink2 }}>
                우리 집에서 직선 거리{" "}
                <strong style={{ color: T.accent }}>
                  {formatDistance(calculateDistanceMeters(
                    userProfile.home_latitude, userProfile.home_longitude,
                    job.latitude, job.longitude
                  ))}
                </strong>
              </div>
            )}
            {job.nearest_station && (
              <div style={{ fontSize: 12, color: T.ink2 }}>
                🚇 가장 가까운 역: {job.nearest_station}
                {job.walk_to_station_min ? ` (도보 ${job.walk_to_station_min}분)` : ""}
              </div>
            )}
            {(job.provides_housing || job.provides_shuttle) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {job.provides_housing && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "#E8F5EC",
                  color: T.green,
                  letterSpacing: "-0.01em",
                }}>
                  🏠 숙식 제공
                </span>
              )}
              {job.provides_shuttle && (
                <span style={{
                  padding: "2px 8px",
                  borderRadius: 2,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "#E8F5EC",
                  color: T.green,
                  letterSpacing: "-0.01em",
                }}>
                  🚐 통근버스 제공
                </span>
              )}
            </div>
            )}
          </div>

          {/* 이동수단별 경로 카드 */}
          {userProfile?.home_latitude && userProfile?.home_longitude && (
            <>
              <RouteCard
                origin={{ latitude: userProfile.home_latitude, longitude: userProfile.home_longitude }}
                destination={{ latitude: job.latitude, longitude: job.longitude }}
              />
              {/* 막차 경고 (야간 근무시에만 자동 표시) */}
              {job.time && (() => {
                const endMatch = job.time.match(/~\s*(\d{1,2}:\d{2})/);
                const workEnd = endMatch?.[1];
                if (!workEnd) return null;
                return (
                  <LastTransitCard
                    from={{ latitude: job.latitude, longitude: job.longitude }}
                    to={{ latitude: userProfile.home_latitude, longitude: userProfile.home_longitude }}
                    workEndAt={workEnd}
                  />
                );
              })()}
            </>
          )}

          {!userProfile?.home_latitude && user && (
            <div style={{
              padding: "10px 14px",
              background: T.accentBg,
              border: `1px solid ${T.accent}30`,
              borderLeft: `3px solid ${T.accent}`,
              borderRadius: 4,
              fontSize: 12,
              color: T.ink2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}>
              <span>💡 거주지를 등록하면 이동 시간을 계산해 드려요</span>
              <Link href="/profile" style={{
                background: T.accent,
                color: T.paper,
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
              }}>
                거주지 등록 →
              </Link>
            </div>
          )}
        </div>
      )}

      {!applied ? (
        // 카카오톡 챗봇 진입 — 카카오 노란 배경 (특수 디자인 보존)
        <Card style={{
          background: "#1A1A2E",
          border: "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 28 }}>💬</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#FFFFFF" }}>
                카카오톡 챗봇으로 지원하기
              </div>
              <div style={{ fontSize: 11, color: "#C7CBDB" }}>
                5가지 질문에 답하면 1분 안에 완료!
              </div>
            </div>
          </div>
          <button
            onClick={handleApply}
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: "#FEE500",
              color: "#1A1A2E",
              border: "none",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>💬</span> 챗봇으로 지원하기
          </button>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12, fontSize: 11, color: "#9FA3B8" }}>
            <span>✓ 비자 자동 확인</span>
            <span>✓ 한국어 수준 매칭</span>
            <span>✓ 24시간 내 응답</span>
          </div>
        </Card>
      ) : (
        // 지원 완료 후
        <>
          <div style={{ textAlign: "center", padding: 24, background: T.mintL, borderRadius: 14, border: `2px solid ${T.mint}40`, marginBottom: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 800, color: "#059669", marginBottom: 4, fontSize: 16 }}>
              {t("jobs.applied")}
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 14 }}>
              {t("jobs.appliedDesc")}
            </div>
            {/* Step 3-A Button 컴포넌트 */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Button variant="secondary" href="/my/applications" size="sm">
                지원 내역 보기
              </Button>
              <Button variant="primary" href="/chat" size="sm">
                💬 채팅 열기
              </Button>
            </div>
          </div>

          {/* 시뮬레이터 - 합격 후 계약서 챗봇 체험 */}
          <Card
            style={{
              background: `linear-gradient(135deg, #FFF0EE, #FFE4E0)`,
              border: `2px solid ${T.coral}40`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 28 }}>📝</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.navy }}>
                  합격 후 계약서 챗봇 체험하기
                </div>
                <div style={{ fontSize: 11, color: T.ink3 }}>
                  사장님이 합격시키면 카톡 챗봇으로 계약서 작성까지 진행
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              href={`/simulator?mode=worker&job=${getSimulatorJobId(job)}&autostart=1`}
              fullWidth
            >
              💬 알바생 계약 챗봇 시작 →
            </Button>
            <div style={{ fontSize: 10, color: T.ink3, textAlign: "center", marginTop: 8 }}>
              근무조건 확인 → 이름 입력 → 서명 → 사장님 서명 → 계약 완료
            </div>
          </Card>
        </>
      )}

      {/* 카톡 챗봇 모달 — botAvatar fallback: 🤖 → 💬 (BI v2) */}
      <KakaoChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title={`K-ALBA × ${job.company}`}
        botAvatar={job.icon || "💬"}
        steps={applySteps}
        onComplete={handleChatComplete}
      />
    </div>
  );
}

// K-ALBA 공고 → 시뮬레이터 공고 ID 매핑
function getSimulatorJobId(job) {
  if (!job) return "k1";
  const t = (job.type || job.title || "").toLowerCase();
  if (t.includes("카페") || t.includes("바리스타")) return "k1";
  if (t.includes("농업") || t.includes("딸기") || t.includes("수확")) return "k2";
  if (t.includes("식당") || t.includes("서빙") || t.includes("주방")) return "k3";
  return "k1";
}
