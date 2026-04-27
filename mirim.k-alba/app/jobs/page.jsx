"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getJobs } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useNearbyJobs } from "@/lib/useNearbyJobs";
import { useRecommendedJobs } from "@/lib/useRecommendedJobs";
import { formatDistance } from "@/lib/geolocation";
import { getCurrentUser, getProfile } from "@/lib/supabase";

const DEMO_JOBS = [
  { id: 1, title: "카페 바리스타", company_name: "블루보틀 강남점", sigungu: "강남구", address: "서울 강남구 테헤란로 152", pay_type: "시급", pay_amount: 12000, visa_types: ["D-2", "F-4", "H-2"], created_at: "2026-04-22", latitude: 37.5012, longitude: 127.0396 },
  { id: 2, title: "영어 과외 선생님", company_name: "에듀커넥트", sigungu: "온라인", address: "온라인", pay_type: "시급", pay_amount: 25000, visa_types: ["D-2", "E-7", "F-2", "F-5"], created_at: "2026-04-23", latitude: null, longitude: null },
  { id: 3, title: "한식당 서빙", company_name: "이태원 정", sigungu: "용산구", address: "서울 용산구 이태원로 200", pay_type: "시급", pay_amount: 11000, visa_types: ["D-2", "D-4", "E-9", "H-2", "F-6"], created_at: "2026-04-21", latitude: 37.5344, longitude: 126.9942 },
  { id: 7, title: "딸기 수확 작업자", company_name: "논산 딸기농장", sigungu: "논산시", address: "충남 논산 강경읍", pay_type: "일급", pay_amount: 150000, visa_types: ["E-9", "H-2", "F-4"], created_at: "2026-04-24", latitude: 36.1552, longitude: 127.0098, provides_housing: true },
];

export default function JobsPage() {
  const t = useT();
  const [sortMode, setSortMode] = useState("recommended"); // "recommended" | "nearest" | "latest" | "pay"
  const [radius, setRadius] = useState(10);
  const [visaFilter, setVisaFilter] = useState(null);
  const [koreanFilter, setKoreanFilter] = useState("");
  const [search, setSearch] = useState("");
  const [userProfile, setUserProfile] = useState(null);

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
    userTransport: userProfile?.transport_modes || ["transit", "walk"],
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

  // fallback: 거리 없는 일반 공고 조회
  const [fallbackJobs, setFallbackJobs] = useState(DEMO_JOBS);
  useEffect(() => {
    if (sortMode === "latest" || sortMode === "pay") {
      getJobs().then((data) => {
        if (data && data.length > 0) {
          // employer.company_name을 job.company_name으로 평탄화
          const normalized = data.map((j) => ({
            ...j,
            company_name: j.company_name || j.employer?.company_name || "",
          }));
          setFallbackJobs(normalized);
        }
      });
    }
  }, [sortMode]);

  // 표시할 공고 결정
  let displayJobs;
  if (sortMode === "recommended") {
    displayJobs = recommendedJobs;
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
    if (search && !(j.title?.includes(search) || j.company_name?.includes(search))) return false;
    if (koreanFilter && j.korean_level !== koreanFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: "32px 20px", maxWidth: 820, margin: "0 auto" }}>
      {/* Editorial 헤더 */}
      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Jobs · 알바 찾기
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25 }}>
        {t("jobs.title")}
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        {t("jobs.subtitle")}
      </p>

      {/* 위치 상태 배너 */}
      {sortMode === "nearest" && (
        <LocationBanner
          source={locationSource}
          location={userLocation}
          onRequestLocation={requestLocation}
          loading={loading}
        />
      )}

      {/* 챗봇 체험 배너 */}
      <Link href="/simulator?mode=worker&job=k1&autostart=1" style={{ textDecoration: "none" }}>
        <div style={{
          background: T.n9, color: T.paper, padding: "14px 16px", borderRadius: 4,
          borderLeft: `3px solid ${T.gold}`, marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        }}>
          <div style={{ fontSize: 22 }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", marginBottom: 2 }}>
              알바생 계약 챗봇 체험하기
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
              합격 후 카톡 챗봇 → 서명 → PDF 다운로드
            </div>
          </div>
          <div style={{ fontSize: 18, color: T.gold }}>→</div>
        </div>
      </Link>

      {/* 정렬 탭 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, borderBottom: `1px solid ${T.border}`, overflowX: "auto" }}>
        {[
          ["recommended", "✨ 추천순"],
          ["nearest", "📍 가까운 순"],
          ["latest", "🕒 최신순"],
          ["pay", "💰 급여 높은 순"],
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

      {/* 반경 조절 (가까운 순일 때만) */}
      {sortMode === "nearest" && (
        <div style={{ marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.ink3, marginRight: 4 }}>반경:</span>
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

      {/* 검색 */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jobs.searchPlaceholder")}
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 4,
            border: `1px solid ${T.border}`, fontSize: 14,
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            background: T.paper, letterSpacing: "-0.01em",
          }}
        />
      </div>

      {/* 한국어 수준 필터 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          ["", t("jobs.koreanAll")],
          ["none", t("jobs.koreanNone")],
          ["beginner", t("jobs.koreanBeginner")],
          ["intermediate", t("jobs.koreanIntermediate")],
          ["advanced", t("jobs.koreanAdvanced")],
        ].map(([v, l]) => (
          <button
            key={l}
            onClick={() => setKoreanFilter(v)}
            style={{
              padding: "6px 12px", borderRadius: 4,
              border: `1px solid ${koreanFilter === v ? T.accent : T.border}`,
              background: koreanFilter === v ? T.accentBg : T.paper,
              color: koreanFilter === v ? T.accent : T.ink2,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "-0.01em",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 결과 개수 */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 14, paddingTop: 12, borderTop: `2px solid ${T.n9}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
          총 {displayJobs.length}개 공고
        </div>
        {sortMode === "nearest" && locationSource === "gps" && (
          <div style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>
            📍 현재 위치 기준
          </div>
        )}
      </div>

      {/* 공고 카드 목록 */}
      <div>
        {loading ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: T.ink3, fontSize: 14 }}>
            공고를 찾고 있어요...
          </div>
        ) : displayJobs.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: T.ink3, fontSize: 14 }}>
            {sortMode === "nearest"
              ? `반경 ${radius}km 안에 공고가 없어요. 반경을 늘려보세요.`
              : t("jobs.noResults")}
          </div>
        ) : (
          displayJobs.map((j, idx) => (
            <JobListItem
              key={j.id}
              job={j}
              index={idx}
              showDistance={sortMode === "nearest" || sortMode === "recommended"}
              showReason={sortMode === "recommended"}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 위치 상태 배너
 */
function LocationBanner({ source, location, onRequestLocation, loading }) {
  if (loading) {
    return (
      <div style={{
        padding: "10px 14px", background: T.cream, border: `1px solid ${T.border}`,
        borderRadius: 4, marginBottom: 16, fontSize: 12, color: T.ink2, textAlign: "center",
      }}>
        📡 위치 확인 중...
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
        <span>📍 <strong style={{ color: T.green }}>현재 위치</strong>에서 가까운 순으로 보여줍니다</span>
        <button onClick={onRequestLocation} style={{
          background: "none", border: "none", color: T.ink3,
          fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0,
          fontFamily: "inherit",
        }}>
          다시 찾기
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
        <span>🏠 <strong style={{ color: T.accent }}>등록된 거주지</strong> 기준으로 보여줍니다</span>
        <button onClick={onRequestLocation} style={{
          background: T.accent, color: T.paper, border: "none",
          padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}>
          📍 현재 위치로 찾기
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
      <span>💡 위치를 허용하면 우리 집 근처 공고를 먼저 볼 수 있어요</span>
      <button onClick={onRequestLocation} style={{
        background: T.n9, color: T.paper, border: "none",
        padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit",
      }}>
        📍 위치 허용
      </button>
    </div>
  );
}

/**
 * 공고 리스트 아이템 (에디토리얼 스타일 + 거리 표시)
 */
function JobListItem({ job, index, showDistance, showReason }) {
  return (
    <Link href={`/jobs/${job.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          padding: "18px 0",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "flex-start", gap: 16,
          transition: "background 0.15s", cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = T.cream)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* 인덱스 */}
        <div style={{
          minWidth: 24, fontSize: 12, fontWeight: 700,
          color: T.ink3, letterSpacing: "-0.01em", paddingTop: 3,
        }}>
          {String(index + 1).padStart(2, "0")}
        </div>

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
                <span style={{ color: T.green, fontWeight: 600 }}>🏠 숙식 제공</span>
              )}
              {job.provides_shuttle && (
                <span style={{ color: T.green, fontWeight: 600 }}>🚐 통근버스</span>
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
                  (적합도 {Math.round(job.score_total)}점)
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(job.visa_types || []).slice(0, 3).map((v) => (
              <span key={v} style={{
                padding: "2px 7px", borderRadius: 2, fontSize: 11, fontWeight: 700,
                background: T.n9, color: T.gold, letterSpacing: "0.02em",
              }}>
                {v}
              </span>
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
    </Link>
  );
}
