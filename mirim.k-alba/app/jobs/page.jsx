"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getJobs } from "@/lib/supabase";
import { useT, useLocale } from "@/lib/i18n";
import { useNearbyJobs } from "@/lib/useNearbyJobs";
import { useRecommendedJobs } from "@/lib/useRecommendedJobs";
import { formatDistance } from "@/lib/geolocation";
import { formatPay, shortWorkTime } from "@/lib/format";
import { getCurrentUser, getProfile } from "@/lib/supabase";
import { Input, VisaBadge, PageLoading, Empty } from "@/components/ui";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * /jobs 알바 목록 (BI v2)
 *
 * 페르소나 (BI v2 Section 6):
 *   - 외국인 알바생 30% + 유학생 20% — 가장 자주 보는 페이지
 *   - 무드: 탐색·비교 — 카드 정보 밀도 + 필터
 *
 * 변경점 (BI v2):
 *   - 인라인 비자 <span> → <VisaBadge> ⭐ Step 3-A
 *     (비자별 자동 색상: E-9 코랄, D-2 민트, F-2 골드 등)
 *     ※ BI v2 결정 문서 Section 0.4 — 외국인이 한국어 모르고도
 *       "내 비자로 일할 수 있는 자리"를 5초 안에 시각적으로 인식.
 *   - 인라인 검색 input → <Input variant="search"> (Step 3-B)
 *     (좌측 🔍 아이콘 + clearable)
 *   - 빈 상태 → <Empty variant="no-results"> (Step 3-C)
 *   - 로딩 → <PageLoading> (Step 3-B)
 *
 * 보존:
 *   - 4가지 정렬 (recommended/nearest/latest/pay)
 *   - 위치 기능 (GPS/profile/default)
 *   - 추천 시스템 (점수 + 이유)
 *   - 에디토리얼 인덱스 번호 (01, 02, 03...)
 *   - 챗봇 체험 배너
 *   - JobListItem hover 효과
 *   - 한국어 수준 필터, 반경 조절
 *   - 다국어 (useT)
 */

const DEFAULT_TRANSPORT = ["transit", "walk"];


// 데스크톱(PC) 전용 팔레트 — 모바일 테마(T)는 건드리지 않음
const D = {
  bg: "#F8FAFC", card: "#FFFFFF", border: "#E5E7EB",
  navy: "#1A1A2E", ink: "#1E293B", ink2: "#64748B", ink3: "#94A3B8",
  green: "#16A34A", greenBg: "#ECFDF5", greenBorder: "#86EFAC",
};

const KOREAN_LABEL = {
  none: "한국어 무관", beginner: "한국어 초급",
  intermediate: "한국어 중급", advanced: "한국어 고급",
};

// 비자 코드 -> 의미 (라벨에 괄호로 병기)
const VISA_MEANING = {
  "D-2": "유학", "D-4": "어학연수", "D-10": "구직", "D-8": "투자",
  "E-7": "특정활동", "E-8": "계절근로", "E-9": "비전문취업",
  "F-2": "거주", "F-4": "재외동포", "F-5": "영주", "F-6": "결혼이민",
  "H-2": "방문취업", "G-1": "기타", "C-4": "단기취업",
};

// 시도 약칭 (지역 모호성 해결: 시도 + 시군구)
const SIDO_SHORT = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원도": "강원", "강원특별자치도": "강원", "충청북도": "충북",
  "충청남도": "충남", "전라북도": "전북", "전북특별자치도": "전북", "전라남도": "전남",
  "경상북도": "경북", "경상남도": "경남", "제주특별자치도": "제주",
};
const shortSido = (s) => SIDO_SHORT[s] || s || "";

// 외국인 구직자용 빠른 필터 (PC 전용)
const QUICK_FILTERS = [
  { key: "myVisa", labelKey: "jobs.qfMyVisa", needsVisa: true },
  { key: "housing", labelKey: "jobs.qfHousing" },
  { key: "koreanEasy", labelKey: "jobs.qfKoreanEasy" },
  { key: "weekend", labelKey: "jobs.qfWeekend" },
];

// 데스크톱 카드용 작은 칩
function Chip({ children, green }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
      background: green ? D.greenBg : "#F1F5F9",
      color: green ? D.green : D.ink2,
      border: `1px solid ${green ? D.greenBorder : D.border}`,
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

/**
 * 데스크톱(PC) 좌측 리스트 카드 — 외국인 구직자용 정보 밀도
 * (모바일은 기존 JobListItem 을 그대로 사용; 이 컴포넌트는 PC 마스터-디테일에서만 렌더)
 */
function DesktopJobCard({ job, tr, onSelect, showDistance }) {
  const t = useT();
  const { locale } = useLocale();
  const payType = job.pay_type || "시급";
  const amount = Number(job.pay_amount || 0).toLocaleString();
  const expiry = job.expires_at ? String(job.expires_at).slice(0, 10) : null;
  const visas = (job.visa_types || []).slice(0, 4);
  const loc = (tr && tr.region) || [shortSido(job.sido), job.sigungu].filter(Boolean).join(" ") || job.address || "";
  const workTime = shortWorkTime(job);
  return (
    <div
      onClick={() => onSelect(job.id)}
      style={{
        width: "100%",
        background: D.card,
        border: `1px solid ${D.border}`,
        borderRadius: 14,
        padding: 18,
        cursor: "pointer",
        transition: "border-color .15s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = D.green; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = D.border; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 12, flexShrink: 0 }}>
        {job.icon || "💼"}
      </div>

      {/* 제목 (2줄 고정) */}
      <div style={{ fontWeight: 700, fontSize: 15.5, color: D.navy, lineHeight: 1.35, letterSpacing: "-0.01em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 42, marginBottom: 6 }}>
        {(tr && tr.title) || job.title}
      </div>

      {/* 회사명 (위치 분리) */}
      <div style={{ fontSize: 12.5, color: D.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {job.company_name}
      </div>

      {/* 회사명 다음 구분선 */}
      <div style={{ borderTop: `1px solid ${D.border}`, margin: "12px 0" }} />

      {/* 비자 라벨 — 차분한 파란 라벨 + 의미 병기 */}
      {visas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {visas.map((v) => (
            <span key={v} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: "#EEF4FF", color: "#1D4ED8", border: "1px solid #DBE5FF", whiteSpace: "nowrap" }}>
              {v}{VISA_MEANING[v] ? `(${VISA_MEANING[v]})` : ""}
            </span>
          ))}
        </div>
      )}

      {/* 위치 — 마감 위, 이모지 + 검정 글씨 */}
      {loc && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: D.ink2, marginBottom: 5 }}>
          <span>📍</span>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {loc}{showDistance && job.distance_km != null ? ` · ${formatDistance(job.distance_m)}` : ""}
          </span>
        </div>
      )}

      {workTime && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: D.ink2, marginBottom: 5 }}>
          <span>🕐</span>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workTime}</span>
        </div>
      )}

      {/* 마감일 */}
      {expiry && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: D.ink2, marginBottom: 5 }}>
          <span>📅</span><span>{t("jobDetail.deadline")} {expiry}</span>
        </div>
      )}

      {/* 급여 — 시급/월급/연봉 자동 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: D.ink }}>
        <span>💰</span><span>{locale === "ko" ? `${payType} ${formatPay(job.pay_amount, payType)}` : `${(Number(job.pay_amount) || 0).toLocaleString()} ${t("pay.won")} / ${t("pay." + (({ "시급": "hour", "일급": "day", "월급": "month", "연봉": "year" })[payType] || "hour"))}`}</span>
      </div>

      <div style={{ flex: 1, minHeight: 12 }} />
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(job.id); }}
        style={{ width: "100%", padding: "11px", borderRadius: 8, background: D.navy, color: "#fff", border: "none", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
      >
        {t("jobs.apply")}
      </button>
    </div>
  );
}

// 모바일 컴팩트 리스트 행 (674개를 빠르게 훑기 위한 리스트형)
function MobileListItem({ job, tr, last, onClick }) {
  const t = useT();
  const { locale } = useLocale();
  const visas = (job.visa_types || []).slice(0, 3);
  const loc = (tr && tr.region) || [shortSido(job.sido), job.sigungu].filter(Boolean).join(" ") || job.address || "";
  const workTime = shortWorkTime(job);
  return (
    <div onClick={onClick} style={{ display: "flex", gap: 12, padding: "14px", borderBottom: last ? "none" : `1px solid ${D.border}`, cursor: "pointer" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: D.navy, lineHeight: 1.3, marginBottom: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{(tr && tr.title) || job.title}</div>
        <div style={{ fontSize: 12, color: D.ink2, marginBottom: workTime ? 3 : 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.company_name}{loc ? ` · ${loc}` : ""}</div>
        {workTime && (
          <div style={{ fontSize: 11.5, color: D.ink3, marginBottom: 7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🕐 {workTime}</div>
        )}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {visas.map((v) => (
            <span key={v} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 6px", borderRadius: 5, background: "#EEF4FF", color: "#1D4ED8" }}>{v}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: D.navy, letterSpacing: "-0.01em" }}>{locale === "ko" ? formatPay(job.pay_amount, job.pay_type) : `${(Number(job.pay_amount) || 0).toLocaleString()} ${t("pay.won")}`}</div>
        <div style={{ fontSize: 11, color: D.ink3, marginTop: 2 }}>{locale === "ko" ? (job.pay_type || "시급") : t("pay." + (({ "시급": "hour", "일급": "day", "월급": "month", "연봉": "year" })[job.pay_type] || "hour"))}</div>
      </div>
    </div>
  );
}

// 데스크톱(PC) 목록 히어로 — "외국인 합법 알바" 메시지
function PcHero() {
  const t = useT();
  return (
    <div style={{ background: D.navy, color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: D.greenBorder, letterSpacing: "0.08em", marginBottom: 12 }}>
          {t("jobs.heroEyebrow")}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
          {t("jobs.heroTitle1")}<br />{t("jobs.heroTitle2")}
        </h1>
        <p style={{ fontSize: 15, color: "#C7CBDB", marginTop: 14, lineHeight: 1.6, maxWidth: 580 }}>
          {t("jobs.heroSubtitle")}
        </p>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [sortMode, setSortMode] = useState("recommended");
  const [radius, setRadius] = useState(10);
  const [visaFilter, setVisaFilter] = useState(null);
  const [koreanFilter, setKoreanFilter] = useState("");
  const [search, setSearch] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [page, setPage] = useState(1);
  const isDesktop = useIsDesktop();
  const recRef = useRef(null);
  const PAGE_SIZE = isDesktop ? 12 : 10;
  const [qf, setQf] = useState({});
  const toggleQf = (k) => setQf((prev) => ({ ...prev, [k]: !prev[k] }));
  const [visaSel, setVisaSel] = useState([]);
  const [regionSel, setRegionSel] = useState([]);
  const [industrySel, setIndustrySel] = useState([]);
  const [minWage, setMinWage] = useState(0);
  const [listTr, setListTr] = useState({});
  const toggleIn = (arr, setter, v) =>
    setter(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // 정렬·검색·필터가 바뀌면 1페이지로 리셋
  useEffect(() => {
    setPage(1);
  }, [sortMode, search, koreanFilter, visaFilter, radius, JSON.stringify(qf), visaSel.join(), regionSel.join(), industrySel.join(), minWage]);

  // 사용자 프로필 로드 (추천용)
  useEffect(() => {
    getCurrentUser().then(async (u) => {
      if (u) {
        const p = await getProfile(u.id);
        setUserProfile(p);
      }
    });
  }, []);

  // 추천 모드
  const {
    jobs: recommendedJobs,
    loading: recLoading,
  } = useRecommendedJobs({
    userVisa: userProfile?.visa,
    userKoreanLevel: userProfile?.korean_level,
    userTransport: userProfile?.transport_modes || DEFAULT_TRANSPORT,
    radius: userProfile?.search_radius_km || radius,
    limit: 50,
    enabled: sortMode === "recommended" && userProfile !== null,
  });

  // 위치 기반 공고 훅 (nearest 모드용)
  const {
    jobs: nearbyJobs,
    loading: nearLoading,
    error,
    userLocation,
    locationSource,
    requestLocation,
  } = useNearbyJobs({
    radius,
    visaFilter,
    limit: 50,
    enabled: sortMode === "nearest",
  });

  const loading = sortMode === "recommended" ? recLoading : nearLoading;

  // 실제 DB 공고 조회 (최신순/급여순 + 비로그인 추천 fallback)
  const [fallbackJobs, setFallbackJobs] = useState([]);
  const [fallbackLoading, setFallbackLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setFallbackLoading(true);
    getJobs().then((data) => {
      const normalized = (data || []).map((j) => ({
        ...j,
        // 직접 등록 공고는 employer 프로필, 외부(워크넷) 공고는 employer_external_name
        company_name:
          j.employer?.company_name || j.employer_external_name || j.company_name || "",
      }));
      if (!alive) return;
      setFallbackJobs(normalized);
      setFallbackLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 목록 로딩 상태 — 표시 소스에 맞춰 정확히 판단
  // (데이터 도착 전에 '공고 없음'이 잠깐 뜨는 깜빡임 방지)
  const listLoading =
    sortMode === "nearest"
      ? nearLoading
      : sortMode === "recommended" && userProfile
        ? recLoading
        : fallbackLoading;

  // 좌측 필터용 facet(비자/지역/업종) — 전체 목록에서 상위값 추출
  const facets = useMemo(() => {
    const visa = {}, region = {}, industry = {};
    for (const j of fallbackJobs) {
      (j.visa_types || []).forEach((v) => { if (v) visa[v] = (visa[v] || 0) + 1; });
      if (j.sido) region[j.sido] = (region[j.sido] || 0) + 1;
      if (j.job_type) industry[j.job_type] = (industry[j.job_type] || 0) + 1;
    }
    const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    return { visa: top(visa, 12), region: top(region, 8), industry: top(industry, 8) };
  }, [fallbackJobs]);

  // 표시할 공고 결정
  let displayJobs;
  if (sortMode === "recommended") {
    // 비로그인 사용자는 일반 공고 표시
    displayJobs = userProfile ? recommendedJobs : fallbackJobs;
  } else if (sortMode === "nearest") {
    displayJobs = nearbyJobs;
  } else {
    displayJobs = fallbackJobs;
  }

  // 정렬
  if (sortMode === "latest") {
    displayJobs = [...displayJobs].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  } else if (sortMode === "pay") {
    displayJobs = [...displayJobs].sort((a, b) =>
      (b.pay_amount || 0) - (a.pay_amount || 0)
    );
  }

  // 텍스트 검색 + 한국어 수준 필터 (로컬)
  displayJobs = displayJobs.filter((j) => {
    if (
      search &&
      !(
        j.title?.includes(search) ||
        j.company_name?.includes(search) ||
        (isDesktop && (j.sigungu?.includes(search) || j.address?.includes(search)))
      )
    )
      return false;
    if (koreanFilter && j.korean_level !== koreanFilter) return false;
    // 빠른 필터 (PC 전용; 모바일은 qf가 비어 있어 영향 없음)
    if (qf.housing && !j.provides_housing) return false;
    if (qf.koreanEasy && !["none", "beginner"].includes(j.korean_level)) return false;
    if (qf.weekend && !/토|일|주말|매일/.test(String(j.work_days || ""))) return false;
    if (qf.myVisa && userProfile?.visa && !(j.visa_types || []).includes(userProfile.visa))
      return false;
    if (visaSel.length && !(j.visa_types || []).some((v) => visaSel.includes(v))) return false;
    if (regionSel.length && !regionSel.includes(j.sido)) return false;
    if (industrySel.length && !industrySel.includes(j.job_type)) return false;
    if (minWage && !(j.pay_type === "시급" && (j.pay_amount || 0) >= minWage)) return false;
    return true;
  });

  // 페이지네이션 (10개씩)
  const totalCount = displayJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageJobs = displayJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 목록 지연 배치 번역 (데스크탑, 비한국어): 현재 페이지 공고의 제목·지역을 한 번에 번역/캐시
  const recommended = fallbackJobs.slice(0, 12);
  const pageIdsKey = [...new Set([...pageJobs.map((j) => j.id), ...recommended.map((j) => j.id)])].join(",");
  useEffect(() => {
    if (locale === "ko") return;
    const ids = pageIdsKey ? pageIdsKey.split(",").map(Number) : [];
    if (ids.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/jobs/translate-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids, lang: locale }),
        });
        const d = await r.json();
        if (alive && d?.map) {
          setListTr((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(d.map)) next[`${locale}:${k}`] = v;
            return next;
          });
        }
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [pageIdsKey, locale, isDesktop]);

  // 모바일(친근형): 히어로 + 검색 + 빠른필터 칩 + 추천 peek 캐러셀 + 1열 리스트
  const mobileLayout = (
    <div style={{ background: D.bg, minHeight: "100vh", paddingBottom: 28 }}>
      <div style={{ background: D.navy, color: "#fff", padding: "20px 18px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: D.greenBorder, letterSpacing: "0.04em", marginBottom: 7 }}>{t("jobs.heroEyebrowM")}</div>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.35 }}>{t("jobs.heroTitleM1")}<br />{t("jobs.heroTitleM2")}</div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: "11px 14px", marginBottom: 12 }}>
          <span style={{ fontSize: 15, color: D.ink3 }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("jobs.searchPlaceholder")} style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: D.ink, background: "transparent", fontFamily: "inherit" }} />
        </div>
      </div>

      {recommended.length > 0 && (
        <div style={{ marginTop: 4, marginBottom: 6 }}>
          <div style={{ padding: "4px 16px 10px", fontSize: 15, fontWeight: 800, color: D.navy }}>🔥 {t("jobs.todayRec")}</div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 16px 8px", scrollSnapType: "x mandatory" }}>
            {recommended.map((j) => (
              <div key={"rec-" + j.id} style={{ flex: "0 0 84%", scrollSnapAlign: "start", display: "flex" }}>
                <DesktopJobCard job={j} tr={listTr[`${locale}:${j.id}`]} onSelect={(id) => router.push(`/jobs/${id}`)} showDistance={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.navy }}>{t("jobs.totalJobs").replace("{count}", displayJobs.length)}</div>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5, color: D.ink2, fontFamily: "inherit", background: D.card }}>
            <option value="recommended">{t("jobs.sortRecommended")}</option>
            <option value="nearest">{t("jobs.sortNearest")}</option>
            <option value="latest">{t("jobs.sortLatest")}</option>
            <option value="pay">{t("jobs.sortPay")}</option>
          </select>
        </div>
        {listLoading ? (
          <PageLoading message={t("jobs.loading")} minHeight={200} />
        ) : displayJobs.length === 0 ? (
          <Empty variant="no-results" description={t("jobs.noResults")} />
        ) : (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, overflow: "hidden" }}>
            {pageJobs.map((j, idx) => (
              <MobileListItem key={j.id} job={j} tr={listTr[`${locale}:${j.id}`]} last={idx === pageJobs.length - 1} onClick={() => router.push(`/jobs/${j.id}`)} />
            ))}
          </div>
        )}
        {!listLoading && totalCount > PAGE_SIZE && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onChange={(pg) => { setPage(pg); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    const FilterGroup = ({ title, children }) => (
      <div style={{ padding: "16px 0", borderBottom: `1px solid ${D.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: D.navy, letterSpacing: "0.02em", marginBottom: 10 }}>{title}</div>
        {children}
      </div>
    );
    const CheckRow = ({ label, count, checked, onClick }) => (
      <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 0", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${checked ? D.green : D.border}`, background: checked ? D.green : "#fff", color: "#fff", fontSize: 11, lineHeight: "14px", textAlign: "center", flexShrink: 0 }}>{checked ? "✓" : ""}</span>
        <span style={{ flex: 1, fontSize: 13, color: D.ink }}>{label}</span>
        {count != null && <span style={{ fontSize: 11, color: D.ink3 }}>{count}</span>}
      </button>
    );

    return (
      <div style={{ background: D.bg, minHeight: "100vh" }}>
        <PcHero />
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 28px" }}>
          {/* 검색바 */}
          <div style={{ marginTop: -26, marginBottom: 24, background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0 6px 20px rgba(2,6,23,0.07)", position: "relative", zIndex: 1 }}>
            <span style={{ fontSize: 16, color: D.ink3 }}>🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("jobs.searchPlaceholder")} style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: D.ink, background: "transparent", fontFamily: "inherit" }} />
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} style={{ border: `1px solid ${D.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, color: D.ink2, fontFamily: "inherit", cursor: "pointer" }}>
              <option value="recommended">{t("jobs.sortRecommended")}</option>
              <option value="nearest">{t("jobs.sortNearest")}</option>
              <option value="latest">{t("jobs.sortLatest")}</option>
              <option value="pay">{t("jobs.sortPay")}</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            {/* 좌측 필터 사이드바 */}
            <aside style={{ width: 248, flexShrink: 0, position: "sticky", top: 20 }}>
              <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, padding: "4px 18px 14px" }}>
                {facets.visa.length > 0 && (
                  <FilterGroup title={t("jobs.filterVisa")}>
                    {facets.visa.map(([v, c]) => (
                      <CheckRow key={v} label={v} count={c} checked={visaSel.includes(v)} onClick={() => toggleIn(visaSel, setVisaSel, v)} />
                    ))}
                  </FilterGroup>
                )}
                {facets.region.length > 0 && (
                  <FilterGroup title={t("jobs.filterRegion")}>
                    {facets.region.map(([v, c]) => (
                      <CheckRow key={v} label={v} count={c} checked={regionSel.includes(v)} onClick={() => toggleIn(regionSel, setRegionSel, v)} />
                    ))}
                  </FilterGroup>
                )}
                {facets.industry.length > 0 && (
                  <FilterGroup title={t("jobs.filterIndustry")}>
                    {facets.industry.map(([v, c]) => (
                      <CheckRow key={v} label={v} count={c} checked={industrySel.includes(v)} onClick={() => toggleIn(industrySel, setIndustrySel, v)} />
                    ))}
                  </FilterGroup>
                )}
                <FilterGroup title={t("jobs.filterSalary")}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[[0, "전체"], [10000, "1만원↑"], [11000, "1.1만↑"], [12000, "1.2만↑"]].map(([w, l]) => (
                      <button key={w} onClick={() => setMinWage(w)} style={{ padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${minWage === w ? D.green : D.border}`, background: minWage === w ? D.greenBg : "#fff", color: minWage === w ? D.green : D.ink2 }}>{w === 0 ? t("jobs.filterAll") : (locale === "ko" ? l : `${(Number(w)).toLocaleString()}+`)}</button>
                    ))}
                  </div>
                </FilterGroup>
                <div style={{ paddingTop: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: D.navy, letterSpacing: "0.02em", marginBottom: 10 }}>{t("jobs.moreFilters")}</div>
                  {QUICK_FILTERS.filter((f) => !f.needsVisa || userProfile?.visa).map((f) => (
                    <CheckRow key={f.key} label={t(f.labelKey)} checked={!!qf[f.key]} onClick={() => toggleQf(f.key)} />
                  ))}
                </div>
              </div>
            </aside>

            {/* 우측 카드 그리드 */}
            <main style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: D.navy }}>
                  {t("jobs.totalJobs").replace("{count}", displayJobs.length)}
                </div>
              </div>
              {listLoading ? (
                <PageLoading message={t("jobs.loading")} minHeight={240} />
              ) : displayJobs.length === 0 ? (
                <Empty variant="no-results" description={t("jobs.noResults")} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, alignItems: "stretch" }}>
                  {pageJobs.map((j) => (
                    <DesktopJobCard key={j.id} job={j} tr={listTr[`${locale}:${j.id}`]} selected={false} onSelect={(id) => router.push(`/jobs/${id}`)} showDistance={sortMode === "nearest" || sortMode === "recommended"} />
                  ))}
                </div>
              )}
              {!listLoading && totalCount > PAGE_SIZE && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onChange={(pg) => { setPage(pg); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
                />
              )}
            </main>
          </div>

          {/* 하단 추천 섹션 (좌우 화살표 캐러셀; 컨테이너 폭 안에 고정) */}
          {recommended.length > 0 && (
            <div style={{ marginTop: 44, paddingBottom: 56 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: D.navy }}>🔥 {t("jobs.weeklyRec")}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button aria-label="이전" onClick={() => recRef.current && recRef.current.scrollBy({ left: -recRef.current.clientWidth, behavior: "smooth" })} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${D.border}`, background: D.card, color: D.navy, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>‹</button>
                  <button aria-label="다음" onClick={() => recRef.current && recRef.current.scrollBy({ left: recRef.current.clientWidth, behavior: "smooth" })} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${D.border}`, background: D.card, color: D.navy, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>›</button>
                </div>
              </div>
              <div ref={recRef} style={{ display: "flex", gap: 16, overflowX: "hidden", scrollBehavior: "smooth", scrollSnapType: "x mandatory" }}>
                {recommended.map((j) => (
                  <div key={"rec-" + j.id} style={{ width: "calc((100% - 48px) / 4)", height: 322, flexShrink: 0, display: "flex", scrollSnapAlign: "start" }}>
                    <DesktopJobCard job={j} tr={listTr[`${locale}:${j.id}`]} selected={false} onSelect={(id) => router.push(`/jobs/${id}`)} showDistance={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return mobileLayout;
}

/**
 * 페이지네이션 (10개씩) — 이전/다음 + 페이지 번호(현재 기준 ±2)
 */
function Pagination({ currentPage, totalPages, onChange }) {
  const around = 2;
  let start = Math.max(1, currentPage - around);
  let end = Math.min(totalPages, currentPage + around);
  if (currentPage <= around) end = Math.min(totalPages, 1 + around * 2);
  if (currentPage > totalPages - around) start = Math.max(1, totalPages - around * 2);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const btn = (label, targetPage, disabled, active) => (
    <button
      key={label}
      onClick={() => !disabled && !active && onChange(targetPage)}
      disabled={disabled}
      style={{
        minWidth: 34,
        height: 34,
        padding: "0 8px",
        borderRadius: 4,
        border: `1px solid ${active ? T.n9 : T.border}`,
        background: active ? T.n9 : T.paper,
        color: disabled ? T.ink3 : active ? T.gold : T.ink2,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: disabled || active ? "default" : "pointer",
        fontFamily: "inherit",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 28,
        flexWrap: "wrap",
      }}
    >
      {btn("‹", currentPage - 1, currentPage === 1, false)}
      {start > 1 && (
        <>
          {btn("1", 1, false, currentPage === 1)}
          {start > 2 && <span style={{ color: T.ink3, fontSize: 13 }}>…</span>}
        </>
      )}
      {pages.map((p) => btn(String(p), p, false, p === currentPage))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ color: T.ink3, fontSize: 13 }}>…</span>}
          {btn(String(totalPages), totalPages, false, currentPage === totalPages)}
        </>
      )}
      {btn("›", currentPage + 1, currentPage === totalPages, false)}
    </div>
  );
}

/**
 * 위치 상태 배너
 */
function LocationBanner({ source, location, onRequestLocation, loading }) {
  const t = useT();

  if (loading) {
    return (
      <div style={{
        padding: "10px 14px", background: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, marginBottom: 16, fontSize: 12, color: T.ink2, textAlign: "center",
      }}>
        {t("jobs.locationCheckingGps")}
      </div>
    );
  }

  if (source === "gps") {
    return (
      <div style={{
        padding: "10px 14px", background: "#F0F7F2",
        border: `1px solid ${T.green}40`, borderLeft: `3px solid ${T.green}`,
        borderRadius: 4, marginBottom: 16, fontSize: 12, color: T.ink2,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>{t("jobs.locationGpsActive")}</span>
        <button onClick={onRequestLocation} style={{
          background: "none", border: "none", color: T.ink3,
          fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0,
          fontFamily: "inherit",
        }}>
          {t("jobs.locationRetry")}
        </button>
      </div>
    );
  }

  if (source === "profile") {
    return (
      <div style={{
        padding: "10px 14px", background: T.accentBg,
        border: `1px solid ${T.accent}40`, borderLeft: `3px solid ${T.accent}`,
        borderRadius: 4, marginBottom: 16, fontSize: 12, color: T.ink2,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
      }}>
        <span>{t("jobs.locationProfileActive")}</span>
        <button onClick={onRequestLocation} style={{
          background: T.accent, color: T.paper, border: "none",
          padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          {t("jobs.locationUseGps")}
        </button>
      </div>
    );
  }

  // default (서울 시청)
  return (
    <div style={{
      padding: "10px 14px", background: T.cream,
      border: `1px solid ${T.border}`, borderLeft: `3px solid ${T.gold}`,
      borderRadius: 4, marginBottom: 16, fontSize: 12, color: T.ink2,
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
    }}>
      <span>{t("jobs.locationDefault")}</span>
      <button onClick={onRequestLocation} style={{
        background: T.n9, color: T.paper, border: "none",
        padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        {t("jobs.locationAllow")}
      </button>
    </div>
  );
}

/**
 * 공고 리스트 아이템 (에디토리얼 스타일 + 거리 표시)
 *
 * 변경: 비자 배지 (인라인 span 균일 색상) → VisaBadge (자동 색상)
 */
function JobListItem({ job, index, showDistance, showReason, onSelect, selected }) {
  const t = useT();
  const router = useRouter();
  return (
    <div
      onClick={() => (onSelect ? onSelect(job.id) : router.push(`/jobs/${job.id}`))}
      style={{
        padding: "18px 0",
        paddingLeft: selected ? 12 : 0,
        borderBottom: `1px solid ${T.border}`,
        borderLeft: selected ? `3px solid ${T.accent}` : "none",
        background: selected ? T.cream : "transparent",
        display: "flex", alignItems: "flex-start", gap: 16,
        transition: "background 0.15s", cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
      onMouseLeave={(e) => (e.currentTarget.style.background = selected ? T.cream : "transparent")}
    >
        {/* 인덱스 번호 — 화면에는 숨김 (index prop 유지) */}

        {/* 본문 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <div style={{
              fontWeight: 800, fontSize: 15, color: T.ink,
              letterSpacing: "-0.02em", lineHeight: 1.35,
            }}>
              {job.title}
            </div>
            {showDistance && job.distance_km != null && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3,
                background: job.distance_tier === "near" ? "#F0F7F2"
                          : job.distance_tier === "medium" ? T.cream
                          : T.accentBg,
                color: job.distance_tier === "near" ? T.green
                     : job.distance_tier === "medium" ? T.ink2
                     : T.accent,
                letterSpacing: "-0.01em",
              }}>
                📍 {formatDistance(job.distance_m)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: T.ink2, marginBottom: 8, lineHeight: 1.5 }}>
            {job.company_name} · {job.sigungu || job.address}
          </div>

          {/* 교통/숙식 정보 (있을 때만) */}
          {(job.nearest_station || job.provides_housing || job.provides_shuttle) && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", fontSize: 11, color: T.ink2 }}>
              {job.nearest_station && (
                <span>🚇 {job.nearest_station}{job.walk_to_station_min ? ` ${job.walk_to_station_min}분` : ""}</span>
              )}
              {job.provides_housing && (
                <span style={{ color: T.green, fontWeight: 600 }}>{t("jobs.providesHousing")}</span>
              )}
              {job.provides_shuttle && (
                <span style={{ color: T.green, fontWeight: 600 }}>{t("jobs.providesShuttle")}</span>
              )}
            </div>
          )}

          {/* 추천 이유 (추천순일 때만) */}
          {showReason && job.reason && (
            <div style={{
              fontSize: 11,
              color: T.accent,
              fontWeight: 600,
              marginBottom: 6,
              letterSpacing: "-0.01em",
            }}>
              {job.reason}
              {job.score_total != null && (
                <span style={{
                  color: T.ink3,
                  fontWeight: 500,
                  marginLeft: 6,
                }}>
                  {t("jobs.matchScore").replace("{score}", Math.round(job.score_total))}
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(job.visa_types || []).slice(0, 3).map((v) => (
              <VisaBadge key={v} code={v} />
            ))}
          </div>
        </div>

        {/* 급여 */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: 16, fontWeight: 800, color: T.accent,
            letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 4,
          }}>
            ₩{Number(job.pay_amount).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: T.ink3, letterSpacing: "-0.01em" }}>
            {job.pay_type || "시급"}
          </div>
        </div>
      </div>
  );
}
