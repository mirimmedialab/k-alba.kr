"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { T } from "@/lib/theme";
import KakaoMap from "@/components/KakaoMap";
import { useNearbyJobs } from "@/lib/useNearbyJobs";
import { formatDistance } from "@/lib/geolocation";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { useT } from "@/lib/i18n";
import JobsViewToggle from "@/components/JobsViewToggle";

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
  const t = useT();
  const [radius, setRadius] = useState(10);
  const [visaFilter, setVisaFilter] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const isDesktop = useIsDesktop();
  const listRef = useRef(null);
  const itemRefs = useRef({});
  const [centerJob, setCenterJob] = useState(null);

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

  // 데스크탑 마커는 상세페이지 지도와 동일한 네이비 색
  const desktopMarkers = useMemo(
    () => markers.map((m) => ({ ...m, color: T.navy })),
    [markers]
  );

  // 데스크탑: 선택된 공고(마커/리스트 클릭)를 좌측 리스트 안에서 보이게 자동 스크롤
  useEffect(() => {
    if (!selectedJob) return;
    const el = itemRefs.current[selectedJob.id];
    const container = listRef.current;
    if (!el || !container) return;
    const elRect = el.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    const delta = (elRect.top - cRect.top) - 12;
    container.scrollTo({ top: container.scrollTop + delta, behavior: "smooth" });
  }, [selectedJob]);

  // 반경/비자 변경 시 선택 초기화 → 지도는 사용자 위치 기준으로 줌만 변경되어 확대/축소 모션이 보임
  useEffect(() => {
    setSelectedJob(null);
    setCenterJob(null);
  }, [radius, visaFilter]);

  const VISA_OPTIONS = ["D-2", "D-4", "E-9", "H-2", "F-2", "F-4", "F-6"];

  // ───────── 데스크탑(웹) 전용 레이아웃: 좌측 공고 리스트 + 우측 큰 지도 ─────────
  if (isDesktop) {
    const chip = (on) => ({ padding: "5px 12px", borderRadius: 4, border: `1px solid ${on ? T.n9 : T.border}`, background: on ? T.n9 : T.paper, color: on ? T.gold : T.ink2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });
    const chipA = (on) => ({ padding: "5px 12px", borderRadius: 4, border: `1px solid ${on ? T.accent : T.border}`, background: on ? T.accentBg : T.paper, color: on ? T.accent : T.ink2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" });

    return (
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 28px 28px" }}>
        <JobsViewToggle current="map" style={{ maxWidth: 260, marginBottom: 16 }} />
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              {t("jobsMap.eyebrow")}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>
              {t("jobsMap.nearbyCount", { n: jobsWithCoords.length })}
            </div>
          </div>
          <Link href="/jobs" style={{ textDecoration: "none" }}>
            <span style={{ display: "inline-block", padding: "8px 14px", fontSize: 13, fontWeight: 600, color: T.ink2, border: `1px solid ${T.border}`, borderRadius: 6 }}>
              {t("jobsMap.viewAllJobs")}
            </span>
          </Link>
        </div>

        {/* 필터 */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: T.ink3, marginRight: 2 }}>{t("jobsMap.radius")}</span>
          {[3, 5, 10, 20, 50].map((r) => (
            <button key={r} onClick={() => setRadius(r)} style={chip(radius === r)}>{r}km</button>
          ))}
          <span style={{ width: 1, height: 18, background: T.border, margin: "0 8px" }} />
          <span style={{ fontSize: 12, color: T.ink3, marginRight: 2 }}>{t("jobsMap.visa")}</span>
          <button onClick={() => setVisaFilter(null)} style={chipA(!visaFilter)}>{t("jobsMap.all")}</button>
          {VISA_OPTIONS.map((v) => {
            const active = visaFilter?.includes(v);
            return (
              <button key={v} onClick={() => setVisaFilter(active ? null : [v])} style={chipA(active)}>{v}</button>
            );
          })}
        </div>

        {/* 본문: 좌 리스트 + 우 지도 */}
        <div style={{ display: "flex", gap: 20, height: "calc(100vh - 240px)", minHeight: 480 }}>
          <aside ref={listRef} style={{ width: 380, flexShrink: 0, border: `1px solid ${T.border}`, borderRadius: 12, overflowY: "auto", background: T.paper }}>
            {loading ? (
              <div style={{ padding: 24, fontSize: 13, color: T.ink3 }}>{t("jobsMap.searching")}</div>
            ) : jobsWithCoords.length === 0 ? (
              <div style={{ padding: 24, fontSize: 13, color: T.ink3, lineHeight: 1.7 }}>
                {t("jobsMap.noJobsInRadius")}<br />{t("jobsMap.widenRadius")}
              </div>
            ) : (
              jobsWithCoords.map((j) => {
                const sel = selectedJob?.id === j.id;
                return (
                  <div
                    key={j.id}
                    ref={(el) => { if (el) itemRefs.current[j.id] = el; }}
                    onClick={() => { setSelectedJob(j); setCenterJob(j); }}
                    style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: sel ? T.cream : "transparent", borderLeft: `3px solid ${sel ? T.accent : "transparent"}` }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4, letterSpacing: "-0.01em" }}>{j.title}</div>
                    <div style={{ fontSize: 12, color: T.ink2, marginBottom: 6 }}>{j.company_name || ""}{j.company_name ? " · " : ""}{j.sigungu || j.address || ""}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: T.accent }}>{j.pay_type || t("jobsMap.payHourly")} ₩{Number(j.pay_amount || 0).toLocaleString()}</span>
                      <span style={{ fontSize: 12, color: T.ink3 }}>📍 {formatDistance(j.distance_m)}</span>
                    </div>
                    {sel && (
                      <Link href={`/jobs/${j.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ marginTop: 10, padding: "8px", textAlign: "center", background: T.n9, color: T.paper, borderRadius: 6, fontSize: 12, fontWeight: 700 }}>{t("jobsMap.viewDetail")}</div>
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </aside>

          <main style={{ flex: 1, position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
            {userLocation && (
              <KakaoMap
                center={centerJob && centerJob.latitude && centerJob.longitude ? { latitude: centerJob.latitude, longitude: centerJob.longitude } : userLocation}
                level={radius <= 3 ? 4 : radius <= 10 ? 6 : 8}
                markers={desktopMarkers}
                userLocation={locationSource === "gps" ? userLocation : null}
                cluster={true}
                reactiveLevel={true}
                clusterColor={T.accent}
                highlight={centerJob && centerJob.latitude && centerJob.longitude ? { latitude: centerJob.latitude, longitude: centerJob.longitude } : null}
                highlightColor={T.accent}
                height="100%"
              />
            )}
            {locationSource !== "default" && (
              <div style={{ position: "absolute", top: 12, right: 12, background: T.paper, border: `1px solid ${T.border}`, borderRadius: 4, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: locationSource === "gps" ? T.green : T.accent, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 5 }}>
                {locationSource === "gps" ? t("jobsMap.currentLocation") : t("jobsMap.registeredResidence")}
              </div>
            )}
            {locationSource === "default" && !loading && (
              <button onClick={requestLocation} style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", padding: "12px 22px", background: T.n9, color: T.paper, border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 12px rgba(10,22,40,0.25)", zIndex: 5, whiteSpace: "nowrap" }}>
                {t("jobsMap.allowLocation")}
              </button>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 56px)",
      background: T.paper,
    }}>
      <div style={{ padding: "12px 16px 0", background: T.paper, flexShrink: 0 }}>
        <JobsViewToggle current="map" />
      </div>
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
              {t("jobsMap.eyebrow")}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em" }}>
              {t("jobsMap.nearbyCount", { n: jobsWithCoords.length })}
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
              {t("jobsMap.viewList")}
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
          <span style={{ fontSize: 11, color: T.ink3, marginRight: 2 }}>{t("jobsMap.radiusColon")}</span>
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

          <span style={{ fontSize: 11, color: T.ink3, marginLeft: 8, marginRight: 2 }}>{t("jobsMap.visaColon")}</span>
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
            {t("jobsMap.all")}
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
            {t("jobsMap.searching")}
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
            {locationSource === "gps" ? t("jobsMap.currentLocation") : t("jobsMap.registeredResidence")}
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
            {t("jobsMap.allowLocation")}
          </button>
        )}
      </div>

      {/* 하단 선택 공고 시트 */}
      {selectedJob && (
        <SelectedJobSheet job={selectedJob} onClose={() => setSelectedJob(null)} t={t} />
      )}
    </div>
  );
}

/**
 * 마커 클릭 시 하단에 뜨는 공고 요약 시트
 */
function SelectedJobSheet({ job, onClose, t }) {
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
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 2 }}>{t("jobsMap.distance")}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
            📍 {formatDistance(job.distance_m)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 2 }}>{job.pay_type || t("jobsMap.payHourly")}</div>
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
            {t("jobsMap.providesHousing")}
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
          {t("jobsMap.viewDetail")}
        </button>
      </Link>
    </div>
  );
}
