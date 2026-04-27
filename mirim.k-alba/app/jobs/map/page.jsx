"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import KakaoMap from "@/components/KakaoMap";
import { useNearbyJobs } from "@/lib/useNearbyJobs";
import { formatDistance } from "@/lib/geolocation";

/**
 * 지도 탐색 뷰 — 반경 내 공고들을 지도에 마커로 표시
 *
 * URL: /jobs/map
 * 부가: ?lat=37.5&lng=127.0&radius=10 파라미터로 초기 중심 조정 가능
 *
 * 특징:
 *   - 마커 클러스터링 (지역별 공고 많을 때 자동 묶음)
 *   - 하단 시트: 선택한 마커의 공고 요약
 *   - 상단 필터: 반경 / 비자 / 업종
 */
export default function JobsMapPage() {
  const [radius, setRadius] = useState(10);
  const [visaFilter, setVisaFilter] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const {
    jobs,
    loading,
    userLocation,
    locationSource,
    requestLocation,
  } = useNearbyJobs({
    radius,
    visaFilter,
    limit: 100, // 지도 뷰는 더 많이 로드
  });

  // 좌표 있는 공고만 (없으면 마커 표시 불가)
  const jobsWithCoords = useMemo(
    () => jobs.filter((j) => j.latitude && j.longitude),
    [jobs]
  );

  // 마커 구성 (공고 → KakaoMap용 객체)
  const markers = useMemo(
    () =>
      jobsWithCoords.map((j) => ({
        latitude: j.latitude,
        longitude: j.longitude,
        title: j.title,
        color: j.provides_housing ? T.green : T.accent,
        infoHtml: `
          <div style="font-weight:700;margin-bottom:4px;">${j.title}</div>
          <div style="color:#3F5273;font-size:11px;">${j.company_name || ""}</div>
          <div style="color:#C2512A;font-weight:700;margin-top:4px;">
            ₩${Number(j.pay_amount || 0).toLocaleString()} · ${formatDistance(j.distance_m)}
          </div>
        `,
        onClick: () => setSelectedJob(j),
      })),
    [jobsWithCoords]
  );

  const VISA_OPTIONS = ["D-2", "D-4", "E-9", "H-2", "F-2", "F-4", "F-6"];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 56px)",
      background: T.paper,
    }}>
      {/* 상단 필터 */}
      <div style={{
        padding: "12px 16px",
        background: T.paper,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}>
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.ink3,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}>
              Map · 지도 탐색
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>
              내 주변 공고 {jobsWithCoords.length}개
            </div>
          </div>
          <Link href="/jobs" style={{ textDecoration: "none" }}>
            <div style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              color: T.ink2,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              letterSpacing: "-0.01em",
            }}>
              📋 리스트 보기
            </div>
          </Link>
        </div>

        {/* 반경 + 비자 필터 */}
        <div style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: T.ink3, marginRight: 2 }}>반경:</span>
          {[3, 5, 10, 20, 50].map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              style={{
                padding: "4px 10px",
                borderRadius: 3,
                border: `1px solid ${radius === r ? T.n9 : T.border}`,
                background: radius === r ? T.n9 : T.paper,
                color: radius === r ? T.gold : T.ink2,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {r}km
            </button>
          ))}

          <span style={{ fontSize: 11, color: T.ink3, marginLeft: 8, marginRight: 2 }}>비자:</span>
          <button
            onClick={() => setVisaFilter(null)}
            style={{
              padding: "4px 10px",
              borderRadius: 3,
              border: `1px solid ${!visaFilter ? T.accent : T.border}`,
              background: !visaFilter ? T.accentBg : T.paper,
              color: !visaFilter ? T.accent : T.ink2,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            전체
          </button>
          {VISA_OPTIONS.map((v) => {
            const active = visaFilter?.includes(v);
            return (
              <button
                key={v}
                onClick={() => setVisaFilter(active ? null : [v])}
                style={{
                  padding: "4px 10px",
                  borderRadius: 3,
                  border: `1px solid ${active ? T.accent : T.border}`,
                  background: active ? T.accentBg : T.paper,
                  color: active ? T.accent : T.ink2,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* 지도 영역 (flex:1) */}
      <div style={{ flex: 1, position: "relative", minHeight: 300 }}>
        {loading ? (
          <div style={{
            position: "absolute",
            inset: 0,
            background: T.cream,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: T.ink3,
            zIndex: 10,
          }}>
            🗺️ 주변 공고 찾는 중...
          </div>
        ) : null}

        {userLocation && (
          <KakaoMap
            center={userLocation}
            level={radius <= 3 ? 4 : radius <= 10 ? 6 : 8}
            markers={markers}
            userLocation={locationSource === "gps" ? userLocation : null}
            cluster={true}
            height="100%"
          />
        )}

        {/* 위치 소스 뱃지 */}
        {locationSource !== "default" && (
          <div style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: T.paper,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            color: locationSource === "gps" ? T.green : T.accent,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 5,
          }}>
            {locationSource === "gps" ? "📍 현재 위치" : "🏠 등록 거주지"}
          </div>
        )}

        {/* 위치 허용 버튼 (기본값일 때만) */}
        {locationSource === "default" && !loading && (
          <button
            onClick={requestLocation}
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              right: 16,
              padding: "12px",
              background: T.n9,
              color: T.paper,
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "-0.01em",
              boxShadow: "0 4px 12px rgba(10,22,40,0.25)",
              zIndex: 5,
            }}
          >
            📍 내 위치 허용하고 주변 공고 보기
          </button>
        )}
      </div>

      {/* 하단 선택 공고 시트 */}
      {selectedJob && (
        <SelectedJobSheet job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

/**
 * 마커 클릭 시 하단에 뜨는 공고 요약 시트
 */
function SelectedJobSheet({ job, onClose }) {
  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      maxWidth: 820,
      margin: "0 auto",
      background: T.paper,
      borderTop: `3px solid ${T.gold}`,
      boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
      padding: "16px 20px 20px",
      zIndex: 20,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    }}>
      {/* 드래그 핸들 (시각적 힌트) */}
      <div style={{
        width: 36,
        height: 4,
        background: T.border,
        borderRadius: 2,
        margin: "0 auto 12px",
      }} />

      {/* 헤더 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 10,
        gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: T.ink,
            marginBottom: 4,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
          }}>
            {job.title}
          </div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>
            {job.company_name} · {job.sigungu || job.address}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 20,
            color: T.ink3,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* 거리 + 급여 */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 2 }}>거리</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
            📍 {formatDistance(job.distance_m)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 2 }}>{job.pay_type || "시급"}</div>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            color: T.accent,
            letterSpacing: "-0.025em",
          }}>
            ₩{Number(job.pay_amount).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 뱃지 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        {(job.visa_types || []).slice(0, 4).map((v) => (
          <span key={v} style={{
            padding: "2px 7px",
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 700,
            background: T.n9,
            color: T.gold,
            letterSpacing: "0.02em",
          }}>
            {v}
          </span>
        ))}
        {job.provides_housing && (
          <span style={{
            padding: "2px 7px",
            borderRadius: 2,
            fontSize: 11,
            fontWeight: 700,
            background: "#E8F5EC",
            color: T.green,
          }}>
            🏠 숙식 제공
          </span>
        )}
      </div>

      {/* 상세 보기 버튼 */}
      <Link href={`/jobs/${job.id}`} style={{ textDecoration: "none" }}>
        <button style={{
          width: "100%",
          padding: 13,
          background: T.n9,
          color: T.paper,
          border: "none",
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "-0.01em",
        }}>
          자세히 보기 →
        </button>
      </Link>
    </div>
  );
}
