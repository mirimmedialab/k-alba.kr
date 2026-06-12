"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { getJobs } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useNearbyJobs } from "@/lib/useNearbyJobs";
import { useRecommendedJobs } from "@/lib/useRecommendedJobs";
import { formatDistance } from "@/lib/geolocation";
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

const PAGE_SIZE = 10;

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

// 외국인 구직자용 빠른 필터 (PC 전용)
const QUICK_FILTERS = [
  { key: "myVisa", label: "내 비자에 맞는 공고", needsVisa: true },
  { key: "housing", label: "숙소 제공" },
  { key: "koreanEasy", label: "한국어 초급 가능" },
  { key: "weekend", label: "주말 근무" },
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
function DesktopJobCard({ job, selected, onSelect, showDistance }) {
  const koreanLabel = KOREAN_LABEL[job.korean_level];
  const wh = String(job.work_hours || "").split(/\s{2,}|\n|,/)[0].trim();
  const meta = [job.headcount ? `모집 ${job.headcount}명` : null, wh || null]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <div
      onClick={() => onSelect(job.id)}
      style={{
        background: selected ? D.greenBg : D.card,
        border: `1px solid ${selected ? D.greenBorder : D.border}`,
        borderLeft: `3px solid ${selected ? D.green : "transparent"}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.borderColor = D.green; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.borderColor = D.border; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: D.navy, lineHeight: 1.35, letterSpacing: "-0.01em" }}>
          {job.title}
        </div>
        {showDistance && job.distance_km != null && (
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: D.green }}>
            📍 {formatDistance(job.distance_m)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12.5, color: D.ink2, marginBottom: 10 }}>
        {job.company_name} · {job.sigungu || job.address}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {(job.visa_types || []).slice(0, 3).map((v) => (
          <VisaBadge key={v} code={v} />
        ))}
        {koreanLabel && <Chip>{koreanLabel}</Chip>}
        {job.provides_housing && <Chip green>🏠 숙소제공</Chip>}
        {job.provides_shuttle && <Chip green>🚐 통근버스</Chip>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
        <div style={{ fontSize: 11.5, color: D.ink3, lineHeight: 1.4, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {meta}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: D.green, letterSpacing: "-0.02em", lineHeight: 1 }}>
            ₩{Number(job.pay_amount).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: D.ink3, marginTop: 3 }}>{job.pay_type || "시급"}</div>
        </div>
      </div>
    </div>
  );
}

// 데스크톱(PC) 목록 히어로 — "외국인 합법 알바" 메시지
function PcHero() {
  return (
    <div style={{ background: D.navy, color: "#fff" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 28px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: D.greenBorder, letterSpacing: "0.08em", marginBottom: 12 }}>
          K-ALBA · 외국인 합법 알바
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
          내 비자로 일할 수 있는<br />합법 알바를 찾아보세요
        </h1>
        <p style={{ fontSize: 15, color: "#C7CBDB", marginTop: 14, lineHeight: 1.6, maxWidth: 580 }}>
          비자·한국어 조건에 맞는 공고만 모았어요. 카드의 비자 뱃지로 합법 가능 여부를 바로 확인하세요.
        </p>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const t = useT();
  const router = useRouter();
  const [sortMode, setSortMode] = useState("recommended");
  const [radius, setRadius] = useState(10);
  const [visaFilter, setVisaFilter] = useState(null);
  const [koreanFilter, setKoreanFilter] = useState("");
  const [search, setSearch] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [page, setPage] = useState(1);
  const isDesktop = useIsDesktop();
  const [qf, setQf] = useState({});
  const toggleQf = (k) => setQf((prev) => ({ ...prev, [k]: !prev[k] }));

  // 정렬·검색·필터가 바뀌면 1페이지로 리셋
  useEffect(() => {
    setPage(1);
  }, [sortMode, search, koreanFilter, visaFilter, radius, JSON.stringify(qf)]);

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

  const listColumn = (
    <div style={{ padding: isDesktop ? "28px 4px" : "32px 20px", maxWidth: isDesktop ? "none" : 820, margin: isDesktop ? 0 : "0 auto" }}>
      {/* Editorial 헤더 (모바일 전용; PC는 PcHero 사용) */}
      {!isDesktop && (
        <>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            {t("jobs.pageLabel")}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25 }}>
            {t("jobs.title")}
          </h1>
          <p style={{ color: T.ink2, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            {t("jobs.subtitle")}
          </p>
        </>
      )}

      {/* 위치 상태 배너 */}
      {sortMode === "nearest" && (
        <LocationBanner
          source={locationSource}
          location={userLocation}
          onRequestLocation={requestLocation}
          loading={loading}
        />
      )}

      {/* 챗봇 체험 배너 제거됨 */}

      {/* 정렬 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
        {[
          ["recommended", t("jobs.sortRecommended")],
          ["nearest", t("jobs.sortNearest")],
          ["latest", t("jobs.sortLatest")],
          ["pay", t("jobs.sortPay")],
        ].map(([v, l]) => {
          const active = sortMode === v;
          return (
            <button
              key={v}
              onClick={() => setSortMode(v)}
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
              }}
            >
              {l}
            </button>
          );
        })}
      </div>

      {/* 외국인용 빠른 필터 (PC 전용) */}
      {isDesktop && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {QUICK_FILTERS.filter((f) => !f.needsVisa || userProfile?.visa).map((f) => {
            const on = !!qf[f.key];
            return (
              <button
                key={f.key}
                onClick={() => toggleQf(f.key)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 999,
                  border: `1px solid ${on ? D.greenBorder : D.border}`,
                  background: on ? D.greenBg : D.card,
                  color: on ? D.green : D.ink2,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {on ? "✓ " : ""}{f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 비로그인 추천순 안내 배너 */}
      {sortMode === "recommended" && !userProfile && (
        <div
          onClick={() => router.push("/login")}
          style={{
            background: T.goldL,
            color: T.ink,
            padding: "12px 16px",
            borderRadius: 4,
            borderLeft: `3px solid ${T.gold}`,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 18 }}>🔑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, letterSpacing: "-0.01em" }}>
              로그인하고 내 비자, 위치에 맞는 맞춤 추천을 받아보세요
            </div>
          </div>
          <div style={{ fontSize: 16, color: T.gold, fontWeight: 700 }}>→</div>
        </div>
      )}

      {/* 반경 조절 (가까운 순일 때만) */}
      {sortMode === "nearest" && (
        <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.ink3, marginRight: 4 }}>{t("jobs.radiusLabel")}</span>
          {[3, 5, 10, 20, 50].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              style={{
                padding: "4px 10px", borderRadius: 4,
                border: `1px solid ${radius === r ? T.n9 : T.border}`,
                background: radius === r ? T.n9 : T.paper,
                color: radius === r ? T.gold : T.ink2,
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {r}km
            </button>
          ))}
        </div>
      )}

      {/* 검색 — Step 3-B Input variant="search" */}
      <div style={{ marginBottom: 12 }}>
        <Input
          variant="search"
          placeholder={isDesktop ? "직무, 회사, 지역 검색" : t("jobs.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          iconLeft={<span style={{ fontSize: 14 }}>🔍</span>}
          clearable
          onClear={() => setSearch("")}
        />
      </div>

      {/* 한국어 수준 필터 제거됨 */}

      {/* 결과 개수 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, paddingTop: 12, borderTop: `2px solid ${T.n9}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
          {t("jobs.totalJobs").replace("{count}", displayJobs.length)}
        </div>
        {sortMode === "nearest" && locationSource === "gps" && (
          <div style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>
            {t("jobs.currentLocationLabel")}
          </div>
        )}
      </div>

      {/* 공고 카드 목록 */}
      <div
        style={
          isDesktop && !listLoading && displayJobs.length > 0
            ? { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, alignItems: "start" }
            : undefined
        }
      >
        {listLoading ? (
          // Step 3-B PageLoading 인라인 — 데이터 로딩 중에는 '없음' 대신 로딩 표시
          <PageLoading message={t("jobs.loading")} minHeight={240} />
        ) : displayJobs.length === 0 ? (
          // Step 3-C Empty
          <Empty
            variant="no-results"
            description={
              sortMode === "nearest"
                ? t("jobs.noResultsRadius").replace("{radius}", radius)
                : t("jobs.noResults")
            }
          />
        ) : (
          pageJobs.map((j, idx) =>
            isDesktop ? (
              <DesktopJobCard
                key={j.id}
                job={j}
                selected={false}
                onSelect={(id) => router.push(`/jobs/${id}`)}
                showDistance={sortMode === "nearest" || sortMode === "recommended"}
              />
            ) : (
              <JobListItem
                key={j.id}
                job={j}
                index={(currentPage - 1) * PAGE_SIZE + idx}
                showDistance={sortMode === "nearest" || sortMode === "recommended"}
                showReason={sortMode === "recommended"}
              />
            )
          )
        )}
      </div>

      {/* 페이지네이션 */}
      {!listLoading && totalCount > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={(p) => {
            setPage(p);
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ background: D.bg, minHeight: "100vh" }}>
        <PcHero />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 28px 56px" }}>
          {listColumn}
        </div>
      </div>
    );
  }

  return listColumn;
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
