"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getJob, applyJob, getCurrentUser, getProfile } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/useIsDesktop";
import KakaoMap from "@/components/KakaoMap";
import RouteCard from "@/components/RouteCard";
import LastTransitCard from "@/components/LastTransitCard";
import { formatDistance, calculateDistanceMeters } from "@/lib/geolocation";
import { formatPay, formatWorkHours } from "@/lib/format";
import {
  Button,
  Card,
  CardTitle,
  CardSubtitle,
  VisaBadge,
  PageLoading,
} from "@/components/ui";

// 데스크톱(PC) 전용 팔레트 — 모바일 테마(T)는 건드리지 않음 (embedded 모드에서만 사용)
const D = {
  bg: "#F8FAFC", card: "#FFFFFF", border: "#E5E7EB",
  navy: "#1A1A2E", ink: "#1E293B", ink2: "#64748B", ink3: "#94A3B8",
  green: "#16A34A", greenBg: "#ECFDF5", greenBorder: "#86EFAC",
};
const D_KOREAN = { none: "한국어 무관", beginner: "한국어 초급", intermediate: "한국어 중급", advanced: "한국어 고급" };
const VISA_MEANING = {
  "D-2": "유학", "D-4": "어학연수", "D-10": "구직", "D-8": "투자",
  "E-7": "특정활동", "E-8": "계절근로", "E-9": "비전문취업",
  "F-2": "거주", "F-4": "재외동포", "F-5": "영주", "F-6": "결혼이민",
  "H-2": "방문취업", "G-1": "기타", "C-4": "단기취업",
};

function Chip2({ children, green }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
      background: green ? D.greenBg : "#F1F5F9",
      color: green ? D.green : D.ink2,
      border: `1px solid ${green ? D.greenBorder : D.border}`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

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

export default function JobDetail({ jobId, embedded = false }) {
  const router = useRouter();
  const t = useT();
  const isDesktop = useIsDesktop();
  const [job, setJob] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    getJob(jobId).then((data) => {
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
  }, [jobId]);

  const handleApply = async () => {
    // 원문 공고 링크가 있으면 그쪽으로 이동(외부 새 탭). 없으면(직접등록 공고) 내부 원클릭 지원.
    if (job?.apply_url) {
      if (typeof window !== "undefined") window.open(job.apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    const u = await getCurrentUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    setLoading(true);
    const { error } = await applyJob(jobId, u.id, "지원합니다.");
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

  if (isDesktop) {
    const koreanLabel = D_KOREAN[job.korean];
    const desc = String(job.desc || "").replace(/^\s*담당업무\s*[:：]?\s*/, "").trimEnd();
    const payUnit = ({ 시급: "시간", 일급: "일", 월급: "월", 연봉: "년" })[job.pay_type] || "시간";
    const rows = [
      ["급여", `${job.pay_type || "시급"} ${formatPay(job.pay, job.pay_type)}`],
      ["지역", job.area],
      ["근무", String(job.hours || job.time || "").trim() || "-"],
      ["업종", job.type],
      job.headcount && String(job.headcount) !== "1"
        ? ["모집인원", /^\d+$/.test(String(job.headcount)) ? `${job.headcount}명` : job.headcount]
        : null,
      job.benefits ? ["복리후생", job.benefits] : null,
      job.expires_at ? ["마감", String(job.expires_at).slice(0, 10)] : null,
    ].filter(Boolean);
    const foreignerRows = [
      ["가능 비자", (job.visa || []).join(", ") || "별도 명시 없음"],
      ["한국어 수준", koreanLabel || "별도 명시 없음"],
      ["숙소 제공", job.provides_housing ? "제공" : "미제공"],
      ["통근버스", job.provides_shuttle ? "제공" : "미제공"],
      job.nearest_station ? ["가까운 역", `${job.nearest_station}${job.walk_to_station_min ? ` (도보 ${job.walk_to_station_min}분)` : ""}`] : null,
    ].filter(Boolean);
    const hasForeignerInfo =
      (job.visa || []).length > 0 || !!koreanLabel ||
      !!job.provides_housing || !!job.provides_shuttle || !!job.nearest_station;
    const companyRows = [
      ["회사명", job.company || "-"],
      job.type ? ["업종", job.type] : null,
      ["공고 출처", job.source_type === "worknet" ? "고용24(워크넷)" : "K-ALBA 직접등록"],
    ].filter(Boolean);
    const checklist = [
      "비자 만료일이 근무 종료일보다 늦은지 확인하세요.",
      "주당 근무 시간이 비자 허용 범위(예: 유학 D-2 학기 중 주 25시간) 내인지 확인하세요.",
      "근무 시작 전 표준근로계약서를 작성하세요.",
      "급여가 최저임금 이상인지 확인하세요.",
    ];

    const Section = ({ title, id, children }) => (
      <div id={id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: D.navy, marginBottom: 16, letterSpacing: "-0.01em" }}>{title}</div>
        {children}
      </div>
    );
    const Row = ({ k, v, isWork }) => (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontSize: 13.5, color: D.ink3, flexShrink: 0 }}>{k}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: D.ink, textAlign: "right", lineHeight: 1.6 }}>
          {isWork
            ? formatWorkHours(v).map((line, i) => (
                <span key={i} style={{ display: "block" }}>{line}</span>
              ))
            : v}
        </span>
      </div>
    );

    return (
      <div style={{ background: D.bg, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 28px 64px" }}>
          <Link href="/jobs" style={{ color: D.ink2, fontSize: 14, marginBottom: 16, display: "inline-block" }}>← 공고 목록</Link>

          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ fontSize: 40 }}>{job.icon || "💼"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: D.navy, lineHeight: 1.3, margin: 0, letterSpacing: "-0.02em" }}>{job.title}</h1>
                <div style={{ fontSize: 14.5, color: D.ink2, marginTop: 8 }}>{job.company}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  {(job.visa || []).map((v) => <VisaBadge key={v} code={v} variant="solid" size="md" />)}
                  {koreanLabel && <Chip2>{koreanLabel}</Chip2>}
                  {job.provides_housing && <Chip2 green>🏠 숙소제공</Chip2>}
                  {job.provides_shuttle && <Chip2 green>🚐 통근버스</Chip2>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <main style={{ flex: 1, minWidth: 0 }}>
              <Section title="근무 조건">
                {rows.map(([k, v]) => <Row key={k} k={k} v={v} isWork={k === "근무"} />)}
              </Section>
              {hasForeignerInfo && (
                <Section title="외국인 지원 정보" id="foreigner-info">
                  {foreignerRows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
                  <div style={{ marginTop: 14, padding: "12px 14px", background: D.greenBg, border: `1px solid ${D.greenBorder}`, borderRadius: 10, fontSize: 12.5, color: D.green, fontWeight: 600, lineHeight: 1.6 }}>
                    ✓ K-ALBA는 비자에 맞는 합법 알바만 안내합니다. 위 비자 뱃지로 지원 가능 여부를 먼저 확인하세요.
                  </div>
                </Section>
              )}
              {desc && (
                <Section title="상세 설명">
                  <p style={{ margin: 0, fontSize: 13.5, color: D.ink2, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{desc}</p>
                </Section>
              )}
              <Section title="회사 정보">
                {companyRows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
              </Section>
              {job.apply_url && (
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.ink2, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🔗 고용24 원문 보기</a>
              )}
              <Section title="지원 전 확인사항">
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {checklist.map((c, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: D.ink2, lineHeight: 1.6 }}>
                      <span style={{ color: D.green, fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            </main>

            <aside style={{ width: 320, flexShrink: 0, position: "sticky", top: 20 }}>
              <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 16 }}>
                {job.latitude && job.longitude && (
                  <div style={{ marginBottom: 14 }}>
                    <KakaoMap center={{ latitude: job.latitude, longitude: job.longitude }} level={4} markers={[{ latitude: job.latitude, longitude: job.longitude, title: job.company, color: D.navy }]} height={170} />
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: D.ink, lineHeight: 1.5 }}>📍 {job.address_road || job.address || job.area}</div>
                    {job.nearest_station && (
                      <div style={{ marginTop: 6, fontSize: 12, color: D.ink2 }}>🚇 {job.nearest_station}{job.walk_to_station_min ? ` · 걸어서 ${job.walk_to_station_min}분` : ""}</div>
                    )}
                  </div>
                )}
                {applied ? (
                  <div style={{ textAlign: "center", padding: "14px 0", color: D.green, fontWeight: 800, fontSize: 15 }}>🎉 {t("jobs.applied")}</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => router.push("/login")} style={{ flex: 1, padding: "13px 8px", borderRadius: 10, background: "#fff", color: D.ink, border: `1px solid ${D.border}`, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 15 }}>♡</span> 관심 공고
                      </button>
                      <button onClick={handleApply} style={{ flex: 1.3, padding: "13px", borderRadius: 10, background: D.navy, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>지원하기</button>
                    </div>
                    {hasForeignerInfo && (
                      <button onClick={() => { if (typeof document === "undefined") return; const el = document.getElementById("foreigner-info"); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }); }} style={{ width: "100%", marginTop: 8, padding: "12px", borderRadius: 10, background: D.greenBg, color: D.green, border: `1px solid ${D.greenBorder}`, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>비자 가능 여부 확인하기</button>
                    )}
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>

      </div>
    );
  }

  const koreanLabel = D_KOREAN[job.korean];
  const desc = String(job.desc || "").replace(/^\s*담당업무\s*[:：]?\s*/, "").trimEnd();
  const rows = [
    ["급여", `${job.pay_type || "시급"} ${formatPay(job.pay, job.pay_type)}`],
    ["지역", job.area],
    ["근무", String(job.hours || job.time || "").trim() || "-"],
    ["업종", job.type],
    job.headcount && String(job.headcount) !== "1" ? ["모집인원", /^\d+$/.test(String(job.headcount)) ? `${job.headcount}명` : job.headcount] : null,
    job.benefits ? ["복리후생", job.benefits] : null,
    job.expires_at ? ["마감", String(job.expires_at).slice(0, 10)] : null,
  ].filter(Boolean);
  const foreignerRows = [
    ["가능 비자", (job.visa || []).join(", ") || "별도 명시 없음"],
    ["한국어 수준", koreanLabel || "별도 명시 없음"],
    ["숙소 제공", job.provides_housing ? "제공" : "미제공"],
    ["통근버스", job.provides_shuttle ? "제공" : "미제공"],
    job.nearest_station ? ["가까운 역", `${job.nearest_station}${job.walk_to_station_min ? ` (도보 ${job.walk_to_station_min}분)` : ""}`] : null,
  ].filter(Boolean);
  const hasForeignerInfo = (job.visa || []).length > 0 || !!koreanLabel || !!job.provides_housing || !!job.provides_shuttle || !!job.nearest_station;
  const companyRows = [
    ["회사명", job.company || "-"],
    job.type ? ["업종", job.type] : null,
    ["공고 출처", job.source_type === "worknet" ? "고용24(워크넷)" : "K-ALBA 직접등록"],
  ].filter(Boolean);
  const checklist = [
    "비자 만료일이 근무 종료일보다 늦은지 확인하세요.",
    "주당 근무 시간이 비자 허용 범위 내인지 확인하세요.",
    "근무 시작 전 표준근로계약서를 작성하세요.",
    "급여가 최저임금 이상인지 확인하세요.",
  ];
  const Section = ({ title, children }) => (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: D.navy, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
  const Row = ({ k, v, isWork }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 13, color: D.ink3, flexShrink: 0 }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: D.ink, textAlign: "right", lineHeight: 1.6 }}>
        {isWork ? formatWorkHours(v).map((line, i) => (<span key={i} style={{ display: "block" }}>{line}</span>)) : v}
      </span>
    </div>
  );

  return (
    <div style={{ background: D.bg, minHeight: "100vh", paddingBottom: 86 }}>
      <div style={{ padding: "14px 16px 20px" }}>
        <Link href="/jobs" style={{ color: D.ink2, fontSize: 14, marginBottom: 12, display: "inline-block" }}>← 공고 목록</Link>

        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{job.icon || "💼"}</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: D.navy, lineHeight: 1.3, margin: 0, letterSpacing: "-0.01em" }}>{job.title}</h1>
          <div style={{ fontSize: 13.5, color: D.ink2, marginTop: 6 }}>{job.company}</div>
          {(job.visa || []).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {(job.visa || []).map((v) => (
                <span key={v} style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "#EEF4FF", color: "#1D4ED8", border: "1px solid #DBE5FF", whiteSpace: "nowrap" }}>{v}{VISA_MEANING[v] ? `(${VISA_MEANING[v]})` : ""}</span>
              ))}
            </div>
          )}
        </div>

        <Section title="근무 조건">
          {rows.map(([k, v]) => <Row key={k} k={k} v={v} isWork={k === "근무"} />)}
        </Section>

        {hasForeignerInfo && (
          <Section title="외국인 지원 정보">
            {foreignerRows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
            <div style={{ marginTop: 12, padding: "11px 13px", background: D.greenBg, border: `1px solid ${D.greenBorder}`, borderRadius: 10, fontSize: 12, color: D.green, fontWeight: 600, lineHeight: 1.6 }}>
              ✓ K-ALBA는 비자에 맞는 합법 알바만 안내합니다.
            </div>
          </Section>
        )}

        {desc && (
          <Section title="상세 설명">
            <p style={{ margin: 0, fontSize: 13.5, color: D.ink2, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{desc}</p>
          </Section>
        )}

        <Section title="회사 정보">
          {companyRows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
        </Section>

        {job.apply_url && (
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 14, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.ink2, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🔗 고용24 원문 보기</a>
        )}

        <Section title="지원 전 확인사항">
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {checklist.map((c, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: D.ink2, lineHeight: 1.6 }}>
                <span style={{ color: D.green, fontWeight: 800, flexShrink: 0 }}>✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>

        {job.latitude && job.longitude && (
          <Section title="근무지 위치">
            <KakaoMap center={{ latitude: job.latitude, longitude: job.longitude }} level={4} markers={[{ latitude: job.latitude, longitude: job.longitude, title: job.company, color: D.navy }]} height={200} />
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: D.ink }}>📍 {job.address_road || job.address || job.area}</div>
          </Section>
        )}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: D.card, borderTop: `1px solid ${D.border}`, padding: "10px 16px", display: "flex", gap: 10, zIndex: 50 }}>
        <button onClick={() => router.push("/login")} aria-label="관심 공고 등록" style={{ flexShrink: 0, width: 52, borderRadius: 10, background: "#fff", border: `1px solid ${D.border}`, color: D.ink2, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>♡</button>
        {applied ? (
          <div style={{ flex: 1, textAlign: "center", padding: "13px", color: D.green, fontWeight: 800, fontSize: 15 }}>🎉 {t("jobs.applied")}</div>
        ) : (
          <button onClick={handleApply} style={{ flex: 1, padding: "14px", borderRadius: 10, background: D.navy, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>지원하기</button>
        )}
      </div>

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
