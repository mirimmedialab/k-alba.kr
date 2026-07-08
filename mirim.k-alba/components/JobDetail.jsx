"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getJob, applyJob, getCurrentUser, getProfile, isJobFavorited, addFavorite, removeFavorite } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { useIsDesktop } from "@/lib/useIsDesktop";
import KakaoMap from "@/components/KakaoMap";
import RouteCard from "@/components/RouteCard";
import LastTransitCard from "@/components/LastTransitCard";
import { formatDistance, calculateDistanceMeters } from "@/lib/geolocation";
import { formatPay, formatWorkHours, localizeWorkText } from "@/lib/format";
import { romanizeRegion, romanizeCompany } from "@/lib/koroman";
import { visaMeaning, jobNotice } from "@/lib/jobI18n";
import { formatPhoneDisplay } from "@/lib/phone";
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

// 배열/문자열/중첩 JSON문자열(["\"[...\"])을 깨끗한 "a, b, c" 문자열로 정규화 (과거 인코딩 버그 표시 보정)
function cleanList(v) {
  if (v == null) return "";
  let val = v;
  for (let i = 0; i < 3 && typeof val === "string" && /^\s*\[/.test(val); i++) {
    try { val = JSON.parse(val); } catch { break; }
  }
  const out = [];
  const push = (s) => { const t = String(s).replace(/[\[\]"\\]/g, "").trim(); if (t) out.push(t); };
  if (Array.isArray(val)) val.forEach((x) => (Array.isArray(x) ? x.forEach(push) : String(x).split(",").forEach(push)));
  else String(val).split(",").forEach(push);
  return out.join(", ");
}
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

function payDisplay(job, locale, t) {
  if (locale === "ko") return `${job.pay_type || "시급"} ${formatPay(job.pay, job.pay_type)}`;
  const period = ({ "시급": "hour", "일급": "day", "월급": "month", "연봉": "year" })[job.pay_type] || "hour";
  return `${(Number(job.pay) || 0).toLocaleString()} ${t("pay.won")} / ${t("pay." + period)}`;
}
const JD_LABELS = { "근무 조건":"jobDetail.workConditions","외국인 지원 정보":"jobDetail.foreignerInfo","상세 설명":"jobDetail.details","회사 정보":"jobDetail.companyInfo","지원 전 확인사항":"jobDetail.checklistTitle","급여":"jobDetail.pay","지역":"jobDetail.region","근무":"jobDetail.work","업종":"jobDetail.jobType","모집인원":"jobDetail.headcount","복리후생":"jobDetail.benefits","마감":"jobDetail.deadline","가능 비자":"jobDetail.eligibleVisa","한국어 수준":"jobDetail.koreanLevel","숙소 제공":"jobDetail.housing","통근버스":"jobDetail.shuttle","가까운 역":"jobDetail.nearestStation","근무지 위치":"jobDetail.workLocation","회사명":"jobDetail.companyName","공고 출처":"jobDetail.source" };
const JD_VALUES = { "제공":"jobDetail.provided","미제공":"jobDetail.notProvided","별도 명시 없음":"jobDetail.notSpecified","고용24(워크넷)":"jobDetail.sourceWorknet","K-ALBA 직접등록":"jobDetail.sourceDirect" };

export default function JobDetail({ jobId, embedded = false }) {
  const router = useRouter();
  const t = useT();
  const isDesktop = useIsDesktop();
  const { locale } = useLocale();
  const [tr, setTr] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [job, setJob] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [applied, setApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [faved, setFaved] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [revealContact, setRevealContact] = useState(false);
  const [copied, setCopied] = useState("");

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
          benefits: cleanList(data.benefits),
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
                  benefits: cleanList(d.welfare) || prev.benefits,
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

  // 로그인한 사용자가 이 공고를 찜했는지 확인 (user/job 둘 다 준비됐을 때)
  useEffect(() => {
    if (!user || !job?.id) { setFaved(false); return; }
    let cancelled = false;
    isJobFavorited(user.id, job.id).then((f) => { if (!cancelled) setFaved(f); });
    return () => { cancelled = true; };
  }, [user?.id, job?.id]);

  // 하트 토글: 비로그인 → 로그인 페이지, 로그인 → 찜/해제
  const toggleFavorite = async () => {
    const u = user || (await getCurrentUser());
    if (!u) {
      router.push("/login");
      return;
    }
    if (!user) setUser(u);
    if (!job?.id || favBusy) return;
    setFavBusy(true);
    const next = !faved;
    setFaved(next); // 낙관적 업데이트
    const { error } = next
      ? await addFavorite(u.id, job.id)
      : await removeFavorite(u.id, job.id);
    if (error) setFaved(!next); // 실패 시 롤백
    setFavBusy(false);
  };

  // 제목·설명을 사용자 언어로 지연 번역(서버가 캐싱). ko/미지원이면 원본 유지.
  useEffect(() => {
    if (!job || !job.id) return;
    if (locale === "ko") { setTr(null); setTranslating(false); return; }
    let cancelled = false;
    setTranslating(true);
    fetch("/api/jobs/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id, lang: locale, title: job.title, description: job.desc }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d && (d.title || d.description || d.industry || d.work || d.benefits)) setTr({ title: d.title, description: d.description, industry: d.industry, work: d.work, benefits: d.benefits }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTranslating(false); });
    return () => { cancelled = true; };
  }, [job?.id, job?.title, locale]);

  const handleApply = async () => {
    // 원문 공고 링크가 있으면 그쪽으로 이동(외부 새 탭 — 주로 워크넷 공고).
    if (job?.apply_url) {
      if (typeof window !== "undefined") window.open(job.apply_url, "_blank", "noopener,noreferrer");
      return;
    }
    // 실제 지원 기능 도입 전까지는, 사장님 연락처를 팝업으로 안내해 직접 연락하게 한다.
    setRevealContact(false);
    setCopied("");
    setShowContact(true);
  };

  // Step 3-B PageLoading 컴포넌트
  if (!loaded) return <PageLoading message="잠시만 기다려주세요" minHeight={400} />;
  if (!job)
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontSize: 14 }}>
        {t("jobDetail.notFound")}
      </div>
    );

  // 번역본이 있으면 그것으로 표시(없으면 한국어 원본). 앞쪽 말줄임(...) 제거
  const displayTitle = String(((locale !== "ko" && tr?.title) ? tr.title : job.title) || "").replace(/^[\s.·…‥・]+/, "");
  const displayDesc = (locale !== "ko" && tr?.description) ? tr.description : job.desc;

  const translatingOverlay = (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999, display: "flex", alignItems: "center", gap: 10, background: "rgba(15,23,42,0.93)", color: "#fff", padding: "14px 22px", borderRadius: 12, fontSize: 14.5, fontWeight: 700, boxShadow: "0 10px 34px rgba(0,0,0,0.28)" }}>
      <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "kalbaspin 0.7s linear infinite" }} />
      {t("common.translating")}
      <style>{"@keyframes kalbaspin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  // 지원하기 → 사장님 연락처 안내 팝업 (시안 A · 메시지 우선). 실제 지원 기능 도입 전 임시.
  const _mDigits = String(job.contact_mobile || "").replace(/[^0-9]/g, "");
  const _smsTo = job.contact_mobile && _mDigits.startsWith("010") ? job.contact_mobile : null; // 문자는 010 휴대번호만
  const _callTo = job.contact_phone || job.contact_mobile || null; // 전화 걸 번호(유선 우선)
  const _emailTo = job.contact_email || job.employer?.email || null; // 공고 연락 이메일 없으면 사장님 가입 이메일로
  const _hasContact = _smsTo || _callTo || _emailTo;

  const _copyNumMsg = "번호를 복사했어요 · 전화·문자 앱에 붙여넣어 연락해주세요";
  const _copyMailMsg = "이메일 주소를 복사했어요 · 메일에서 붙여넣어 보내주세요";

  let _primary = null;
  if (_smsTo) _primary = { label: "문자로 메시지 보내기", href: `sms:${_smsTo}`, kind: "sms", emoji: "💬", title: "메시지로 지원 의사를 남겨보세요", value: _smsTo, copyMsg: _copyNumMsg };
  else if (_callTo) _primary = { label: "전화하기", href: `tel:${_callTo}`, kind: "call", emoji: "📞", title: "전화로 지원 문의를 해보세요", value: _callTo, copyMsg: _copyNumMsg };
  else if (_emailTo) _primary = { label: "이메일 보내기", href: `mailto:${_emailTo}`, kind: "email", emoji: "✉️", title: "이메일로 지원 문의를 보내보세요", value: _emailTo, copyMsg: _copyMailMsg };

  const _secondary = [];
  if (_primary && _primary.kind === "sms" && _callTo) _secondary.push({ label: "전화", href: `tel:${_callTo}`, value: _callTo, copyMsg: _copyNumMsg });
  if (_primary && _primary.kind !== "email" && _emailTo) _secondary.push({ label: "이메일", href: `mailto:${_emailTo}`, value: _emailTo, copyMsg: _copyMailMsg });

  const _refLine = [
    (_smsTo || _callTo) ? formatPhoneDisplay(job.contact_mobile || job.contact_phone) : null,
    _emailTo,
  ].filter(Boolean).join(" · ");

  const _btn = { display: "block", textAlign: "center", textDecoration: "none", borderRadius: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer" };
  // PC는 tel:/sms:/mailto: 가 안 열리는 경우가 많음 → 데스크탑에선 복사 + 안내 토스트로 대체
  const _onContact = (e, item) => {
    if (!isDesktop) return;
    e.preventDefault();
    try { if (navigator.clipboard) navigator.clipboard.writeText(item.value); } catch (_) {}
    setRevealContact(true);
    setCopied(item.copyMsg);
    setTimeout(() => setCopied(""), 3000);
  };
  const contactModal = showContact ? (
    <div onClick={() => setShowContact(false)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(10,22,40,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 20, padding: "24px 22px", position: "relative" }}>
        <button aria-label="닫기" onClick={() => setShowContact(false)} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", fontSize: 22, color: "#9AA4B2", cursor: "pointer", lineHeight: 1 }}>×</button>
        {_hasContact ? (
          <>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#FAECE7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, fontSize: 22 }}>{_primary.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0A1628", lineHeight: 1.4, marginBottom: 6 }}>{_primary.title}</div>
            <div style={{ fontSize: 13.5, color: "#6B7A95", lineHeight: 1.6, marginBottom: 18 }}>관심 있는 공고라면 사장님께 바로 연락해 지원해보세요.</div>
            <a href={_primary.href} onClick={(e) => _onContact(e, _primary)} style={{ ..._btn, background: "#FF6B5A", color: "#fff", padding: "14px", fontSize: 15 }}>{_primary.label}</a>
            {_secondary.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {_secondary.map((s) => (
                  <a key={s.label} href={s.href} onClick={(e) => _onContact(e, s)} style={{ ..._btn, flex: 1, background: "#fff", color: "#0A1628", border: "1px solid #D4D0CA", padding: "12px", fontSize: 14 }}>{s.label}</a>
                ))}
              </div>
            )}
            {copied && <div style={{ marginTop: 12, textAlign: "center", fontSize: 12.5, color: "#0F6E56", background: "#E1F5EE", borderRadius: 10, padding: "9px 10px", lineHeight: 1.5 }}>{copied}</div>}
            {_refLine && (revealContact ? (
              <div style={{ textAlign: "center", fontSize: 13, color: "#0A1628", marginTop: 14, wordBreak: "break-all", fontWeight: 500 }}>{_refLine}</div>
            ) : (
              <button onClick={() => setRevealContact(true)} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", color: "#9AA4B2", fontSize: 12.5, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>연락처 직접 확인하기</button>
            ))}
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0A1628", marginBottom: 8 }}>등록된 연락처가 없어요</div>
            <div style={{ fontSize: 13.5, color: "#6B7A95", lineHeight: 1.7, marginBottom: 18 }}>이 공고에는 아직 연락 수단이 등록되지 않았어요. 잠시 후 다시 확인해 주세요.</div>
            <button onClick={() => setShowContact(false)} style={{ ..._btn, width: "100%", background: "#0A1628", color: "#fff", padding: "12px", fontSize: 14, border: "none" }}>닫기</button>
          </>
        )}
      </div>
    </div>
  ) : null;

  if (isDesktop) {
    const koreanLabel = D_KOREAN[job.korean] ? t("kr." + job.korean) : null;
    const desc = String(displayDesc || "").replace(/^\s*담당업무\s*[:：]?\s*/, "").trimEnd();
    const payUnit = ({ 시급: "시간", 일급: "일", 월급: "월", 연봉: "년" })[job.pay_type] || "시간";
    const rows = [
      ["급여", payDisplay(job, locale, t)],
      ["지역", locale !== "ko" ? romanizeRegion(job.area) : job.area],
      ["근무", (locale !== "ko" && tr && tr.work) ? tr.work : (String(job.hours || job.time || "").trim() || "-")],
      ["업종", (locale !== "ko" && tr && tr.industry) ? tr.industry : job.type],
      job.headcount && String(job.headcount) !== "1"
        ? ["모집인원", /^\d+$/.test(String(job.headcount)) ? `${t("jobDetail.people", { n: job.headcount })}` : job.headcount]
        : null,
      job.benefits ? ["복리후생", (locale !== "ko" && tr && tr.benefits) ? tr.benefits : job.benefits] : null,
      job.expires_at ? ["마감", String(job.expires_at).slice(0, 10)] : null,
    ].filter(Boolean);
    const foreignerRows = [
      ["가능 비자", (locale !== "ko" ? (job.visa || []).map((x) => x === "비자 무관" ? t("jobs.visaAny") : x) : (job.visa || [])).join(", ") || "별도 명시 없음"],
      ["한국어 수준", koreanLabel || "별도 명시 없음"],
      ["숙소 제공", job.provides_housing ? "제공" : "미제공"],
      ["통근버스", job.provides_shuttle ? "제공" : "미제공"],
      job.nearest_station ? ["가까운 역", `${job.nearest_station}${job.walk_to_station_min ? ` ${t("jobDetail.walk", { min: job.walk_to_station_min })}` : ""}`] : null,
    ].filter(Boolean);
    const hasForeignerInfo =
      (job.visa || []).length > 0 || !!koreanLabel ||
      !!job.provides_housing || !!job.provides_shuttle || !!job.nearest_station;
    const companyRows = [
      ["회사명", locale !== "ko" ? `${job.company || "-"} (${romanizeCompany(job.company)})` : (job.company || "-")],
      job.type ? ["업종", (locale !== "ko" && tr && tr.industry) ? tr.industry : job.type] : null,
      ["공고 출처", job.source_type === "worknet" ? "고용24(워크넷)" : "K-ALBA 직접등록"],
    ].filter(Boolean);
    const checklist = [
      t("jobDetail.check1"),
      t("jobDetail.check2"),
      t("jobDetail.check3"),
      t("jobDetail.check4"),
    ];

    const Section = ({ title, id, children }) => (
      <div id={id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: D.navy, marginBottom: 16, letterSpacing: "-0.01em" }}>{JD_LABELS[title] ? t(JD_LABELS[title]) : title}</div>
        {children}
      </div>
    );
    const Row = ({ k, v, isWork }) => {
      const tv = (typeof v === "string" && JD_VALUES[v]) ? t(JD_VALUES[v]) : v;
      return (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "12px 0", borderBottom: "1px solid #F1F5F9" }}>
        <span style={{ fontSize: 13.5, color: D.ink3, flexShrink: 0 }}>{JD_LABELS[k] ? t(JD_LABELS[k]) : k}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: D.ink, textAlign: "right", lineHeight: 1.6 }}>
          {isWork
            ? formatWorkHours(tv).map((line, i) => (
                <span key={i} style={{ display: "block" }}>{locale !== "ko" ? localizeWorkText(line, t) : line}</span>
              ))
            : tv}
        </span>
      </div>
      );
    };

    return (
      <div style={{ background: D.bg, minHeight: "100vh" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 28px 64px" }}>
          <Link href="/jobs" style={{ color: D.ink2, fontSize: 14, marginBottom: 16, display: "inline-block" }}>← {t("jobDetail.jobsList")}</Link>

          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 28, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ fontSize: 40 }}>{job.icon || "💼"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: D.navy, lineHeight: 1.3, margin: 0, letterSpacing: "-0.02em" }}>{displayTitle}</h1>
                {translating && translatingOverlay}
                {contactModal}
                <div style={{ fontSize: 14.5, color: D.ink2, marginTop: 8 }}>{locale !== "ko" ? `${job.company} (${romanizeCompany(job.company)})` : job.company}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                  {(job.visa || []).map((v) => <VisaBadge key={v} code={v} variant="solid" size="md" />)}
                  {koreanLabel && <Chip2>{koreanLabel}</Chip2>}
                  {job.provides_housing && <Chip2 green>🏠 {t("jobDetail.housing")}</Chip2>}
                  {job.provides_shuttle && <Chip2 green>🚐 {t("jobDetail.shuttle")}</Chip2>}
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
                    ✓ {jobNotice("legalOnly", locale)} {jobNotice("legalCheckBadge", locale)}
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
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.ink2, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🔗 {t("jobDetail.viewOriginal")}</a>
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
                    <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: D.ink, lineHeight: 1.5 }}>📍 {locale !== "ko" ? romanizeRegion(job.address_road || job.address || job.area) : (job.address_road || job.address || job.area)}</div>
                    {job.nearest_station && (
                      <div style={{ marginTop: 6, fontSize: 12, color: D.ink2 }}>🚇 {locale !== "ko" ? romanizeRegion(job.nearest_station) : job.nearest_station}{job.walk_to_station_min ? ` · ${t("jobDetail.walk", { min: job.walk_to_station_min })}` : ""}</div>
                    )}
                  </div>
                )}
                {applied ? (
                  <div style={{ textAlign: "center", padding: "14px 0", color: D.green, fontWeight: 800, fontSize: 15 }}>🎉 {t("jobs.applied")}</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={toggleFavorite} aria-pressed={faved} style={{ flex: 1, padding: "13px 8px", borderRadius: 10, background: faved ? T.coralL : "#fff", color: faved ? T.coral : D.ink, border: `1px solid ${faved ? T.coral : D.border}`, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 15, color: T.coral }}>{faved ? "♥" : "♡"}</span> {t("jobDetail.interest")}
                      </button>
                      <button onClick={handleApply} style={{ flex: 1.3, padding: "13px", borderRadius: 10, background: D.navy, color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{t("jobs.apply")}</button>
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

  const koreanLabel = D_KOREAN[job.korean] ? t("kr." + job.korean) : null;
  const desc = String(displayDesc || "").replace(/^\s*담당업무\s*[:：]?\s*/, "").trimEnd();
  const rows = [
    ["급여", payDisplay(job, locale, t)],
    ["지역", locale !== "ko" ? romanizeRegion(job.area) : job.area],
    ["근무", (locale !== "ko" && tr && tr.work) ? tr.work : (String(job.hours || job.time || "").trim() || "-")],
    ["업종", (locale !== "ko" && tr && tr.industry) ? tr.industry : job.type],
    job.headcount && String(job.headcount) !== "1" ? ["모집인원", /^\d+$/.test(String(job.headcount)) ? `${t("jobDetail.people", { n: job.headcount })}` : job.headcount] : null,
    job.benefits ? ["복리후생", (locale !== "ko" && tr && tr.benefits) ? tr.benefits : job.benefits] : null,
    job.expires_at ? ["마감", String(job.expires_at).slice(0, 10)] : null,
  ].filter(Boolean);
  const foreignerRows = [
    ["가능 비자", (locale !== "ko" ? (job.visa || []).map((x) => x === "비자 무관" ? t("jobs.visaAny") : x) : (job.visa || [])).join(", ") || "별도 명시 없음"],
    ["한국어 수준", koreanLabel || "별도 명시 없음"],
    ["숙소 제공", job.provides_housing ? "제공" : "미제공"],
    ["통근버스", job.provides_shuttle ? "제공" : "미제공"],
    job.nearest_station ? ["가까운 역", `${job.nearest_station}${job.walk_to_station_min ? ` ${t("jobDetail.walk", { min: job.walk_to_station_min })}` : ""}`] : null,
  ].filter(Boolean);
  const hasForeignerInfo = (job.visa || []).length > 0 || !!koreanLabel || !!job.provides_housing || !!job.provides_shuttle || !!job.nearest_station;
  const companyRows = [
    ["회사명", locale !== "ko" ? `${job.company || "-"} (${romanizeCompany(job.company)})` : (job.company || "-")],
    job.type ? ["업종", (locale !== "ko" && tr && tr.industry) ? tr.industry : job.type] : null,
    ["공고 출처", job.source_type === "worknet" ? "고용24(워크넷)" : "K-ALBA 직접등록"],
  ].filter(Boolean);
  const checklist = [
    t("jobDetail.check1"),
    t("jobDetail.check2"),
    t("jobDetail.check3"),
    t("jobDetail.check4"),
  ];
  const Section = ({ title, children }) => (
    <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: D.navy, marginBottom: 14 }}>{JD_LABELS[title] ? t(JD_LABELS[title]) : title}</div>
      {children}
    </div>
  );
  const Row = ({ k, v, isWork }) => {
    const tv = (typeof v === "string" && JD_VALUES[v]) ? t(JD_VALUES[v]) : v;
    return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "11px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 13, color: D.ink3, flexShrink: 0 }}>{JD_LABELS[k] ? t(JD_LABELS[k]) : k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: D.ink, textAlign: "right", lineHeight: 1.6 }}>
        {isWork ? formatWorkHours(tv).map((line, i) => (<span key={i} style={{ display: "block" }}>{locale !== "ko" ? localizeWorkText(line, t) : line}</span>)) : tv}
      </span>
    </div>
    );
  };

  return (
    <div style={{ background: D.bg, minHeight: "100vh", paddingBottom: 86 }}>
      <div style={{ padding: "14px 16px 20px" }}>
        <Link href="/jobs" style={{ color: D.ink2, fontSize: 14, marginBottom: 12, display: "inline-block" }}>← {t("jobDetail.jobsList")}</Link>

        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{job.icon || "💼"}</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: D.navy, lineHeight: 1.3, margin: 0, letterSpacing: "-0.01em" }}>{displayTitle}</h1>
                {translating && translatingOverlay}
                {contactModal}
          <div style={{ fontSize: 13.5, color: D.ink2, marginTop: 6 }}>{locale !== "ko" ? `${job.company} (${romanizeCompany(job.company)})` : job.company}</div>
          {(job.visa || []).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
              {(job.visa || []).map((v) => (
                <span key={v} style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "#EEF4FF", color: "#1D4ED8", border: "1px solid #DBE5FF", whiteSpace: "nowrap" }}>{v}{visaMeaning(v, locale) ? `(${visaMeaning(v, locale)})` : ""}</span>
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
              ✓ {jobNotice("legalOnly", locale)}
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
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "12px", marginBottom: 14, background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, color: D.ink2, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>🔗 {t("jobDetail.viewOriginal")}</a>
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
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: D.ink }}>📍 {locale !== "ko" ? romanizeRegion(job.address_road || job.address || job.area) : (job.address_road || job.address || job.area)}</div>
          </Section>
        )}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: D.card, borderTop: `1px solid ${D.border}`, padding: "10px 16px", display: "flex", gap: 10, zIndex: 50 }}>
        <button onClick={toggleFavorite} aria-pressed={faved} aria-label={t("jobDetail.interest")} style={{ flexShrink: 0, width: 54, borderRadius: 10, background: faved ? T.coralL : "#fff", color: faved ? T.coral : D.ink, border: `1px solid ${faved ? T.coral : D.border}`, fontWeight: 700, fontSize: 18, cursor: "pointer", fontFamily: "inherit" }}>{faved ? "♥" : "♡"}</button>
        {applied ? (
          <div style={{ flex: 1, textAlign: "center", padding: "13px 0", color: D.green, fontWeight: 800, fontSize: 15 }}>🎉 {t("jobs.applied")}</div>
        ) : (
          <button onClick={handleApply} style={{ flex: 1, padding: "13px", borderRadius: 10, background: D.navy, color: "#fff", border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>{t("jobs.apply")}</button>
        )}
      </div>
    </div>
  );
}
