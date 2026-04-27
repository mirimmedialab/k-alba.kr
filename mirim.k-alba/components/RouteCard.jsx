"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { formatDistance } from "@/lib/geolocation";

/**
 * 경로 카드 — 우리집에서 공고까지 이동수단별 소요시간 표시
 *
 * @param origin {latitude, longitude}
 * @param destination {latitude, longitude}
 * @param modes 표시할 이동수단 배열, 기본은 4종 모두
 */
export default function RouteCard({
  origin,
  destination,
  modes = ["transit", "walking", "cycling", "driving"],
}) {
  const [routes, setRoutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!origin || !destination) {
      setLoading(false);
      return;
    }

    let canceled = false;
    setLoading(true);
    setError(null);

    fetch("/api/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, modes }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (canceled) return;
        if (data.ok) setRoutes(data);
        else setError(data.error || "경로를 찾지 못했어요");
      })
      .catch((e) => {
        if (!canceled) setError(e.message);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => { canceled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  if (loading) {
    return (
      <div style={{
        padding: "14px 16px",
        background: T.cream,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        fontSize: 13,
        color: T.ink3,
        textAlign: "center",
      }}>
        🚗 이동 방법 계산 중...
      </div>
    );
  }

  if (error || !routes) {
    return null; // 조용히 실패 (UI 공간 차지 안 함)
  }

  return (
    <div style={{
      background: T.paper,
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* 헤더 */}
      <div style={{
        background: T.cream,
        padding: "10px 14px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.ink3,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}>
          Commute · 이동 방법
        </div>
        <div style={{ fontSize: 12, color: T.ink2, fontWeight: 600 }}>
          직선거리 {formatDistance(routes.straight_distance_m)}
        </div>
      </div>

      {/* 이동수단 목록 */}
      <div>
        {routes.transit && (
          <RouteRow
            icon="🚇"
            label="대중교통"
            duration={routes.transit.duration_sec}
            detail={
              routes.transit.transfers === 0 ? "환승 없음" :
              `환승 ${routes.transit.transfers}회`
            }
            recommended={routes.transit.transfers <= 1 && routes.straight_distance_m < 15000}
          />
        )}
        {routes.walking && (
          <RouteRow
            icon="🚶"
            label="도보"
            duration={routes.walking.duration_sec}
            detail={formatDistance(routes.walking.distance_m)}
            recommended={routes.walking.duration_sec < 1500} // 25분 이내
          />
        )}
        {routes.cycling && (
          <RouteRow
            icon="🚴"
            label="자전거"
            duration={routes.cycling.duration_sec}
            detail={formatDistance(routes.cycling.distance_m)}
          />
        )}
        {routes.driving && (
          <RouteRow
            icon="🚗"
            label="자동차"
            duration={routes.driving.duration_sec}
            detail={
              routes.driving.taxi_fee
                ? `택시 약 ₩${Math.round(routes.driving.taxi_fee).toLocaleString()}`
                : formatDistance(routes.driving.distance_m)
            }
            last={true}
          />
        )}
      </div>
    </div>
  );
}

function RouteRow({ icon, label, duration, detail, recommended, last }) {
  const minutes = Math.round(duration / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const durationText =
    hours > 0 ? `${hours}시간 ${mins}분` : `${minutes}분`;

  return (
    <div style={{
      padding: "12px 14px",
      borderBottom: last ? "none" : `1px solid ${T.border}`,
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}>
          <span style={{
            fontSize: 13,
            fontWeight: 700,
            color: T.ink,
            letterSpacing: "-0.01em",
          }}>
            {label}
          </span>
          {recommended && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: T.green,
              background: "#E8F5EC",
              padding: "1px 6px",
              borderRadius: 2,
              letterSpacing: "-0.01em",
            }}>
              추천
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.ink3 }}>
          {detail}
        </div>
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 800,
        color: T.accent,
        letterSpacing: "-0.02em",
      }}>
        {durationText}
      </div>
    </div>
  );
}
