"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";

/**
 * 막차 시간 경고 카드 (야간 알바용)
 *
 * 근무 종료 시각이 21시 이후인 경우에만 표시.
 * 외국인이 한국 막차 시간 모를 때 결정적 정보.
 *
 * @param from 근무지 좌표
 * @param to 집 좌표
 * @param workEndAt "23:00" 같은 근무 종료 시각
 */
export default function LastTransitCard({ from, to, workEndAt }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to || !workEndAt) {
      setLoading(false);
      return;
    }

    // 종료 시각이 21시 이전이면 체크 불필요 (막차 여유 많음)
    const [h] = workEndAt.split(":").map(Number);
    if (h < 21 && h >= 5) {
      setLoading(false);
      return;
    }

    let canceled = false;
    setLoading(true);

    fetch("/api/last-transit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, workEndAt }),
    })
      .then((r) => r.json())
      .then((result) => {
        if (canceled) return;
        if (result.ok) setData(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => { canceled = true; };
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, workEndAt]);

  if (loading || !data) return null;

  const riskColors = {
    safe:       { bg: "#E8F5EC", border: T.green,    text: T.green,  icon: "✓" },
    tight:      { bg: T.cream,   border: "#D4A017", text: "#A17810", icon: "⚠️" },
    danger:     { bg: T.accentBg, border: T.accent,  text: T.accent, icon: "🚨" },
    impossible: { bg: "#FEE",    border: "#D92020", text: "#A31919", icon: "🚨" },
  };
  const c = riskColors[data.risk_level] || riskColors.safe;

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}40`,
      borderLeft: `3px solid ${c.border}`,
      borderRadius: 4,
      padding: "12px 14px",
      marginTop: 10,
    }}>
      {/* 헤더 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
      }}>
        <span style={{ fontSize: 16 }}>{c.icon}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 800,
          color: c.text,
          letterSpacing: "-0.02em",
        }}>
          {data.risk_level === "safe" ? "귀가 안전" :
           data.risk_level === "tight" ? "막차 임박" :
           data.risk_level === "danger" ? "막차 위험" :
           "막차 시간 지남"}
        </span>
      </div>

      {/* 메시지 */}
      <div style={{
        fontSize: 12,
        color: T.ink2,
        marginBottom: 10,
        lineHeight: 1.5,
      }}>
        {data.warning_message}
      </div>

      {/* 시간 정보 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        padding: 10,
        background: "rgba(255,255,255,0.6)",
        borderRadius: 4,
        marginBottom: data.alternatives?.length ? 10 : 0,
      }}>
        <div>
          <div style={{ fontSize: 10, color: T.ink3, marginBottom: 2 }}>근무 종료</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{data.work_end}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.ink3, marginBottom: 2 }}>예상 도착</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
            {data.estimated_arrival}
            <span style={{ fontSize: 11, color: T.ink3, marginLeft: 4, fontWeight: 500 }}>
              ({data.duration_min}분)
            </span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.ink3, marginBottom: 2 }}>🚇 지하철 막차</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>{data.last_subway_time}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.ink3, marginBottom: 2 }}>🚌 버스 막차</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2 }}>{data.last_bus_time}</div>
        </div>
      </div>

      {/* 대안 교통수단 */}
      {data.alternatives && data.alternatives.length > 0 && (
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: c.text,
            marginBottom: 6,
            letterSpacing: "-0.01em",
          }}>
            💡 대안 교통수단
          </div>
          {data.alternatives.map((alt, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 10px",
              background: "rgba(255,255,255,0.6)",
              borderRadius: 4,
              marginBottom: 4,
              fontSize: 12,
            }}>
              <span style={{ color: T.ink2 }}>
                {alt.label}
                {alt.area && <span style={{ color: T.ink3, marginLeft: 6 }}>· {alt.area}</span>}
              </span>
              {alt.time && (
                <span style={{ color: T.ink, fontWeight: 700 }}>{alt.time}</span>
              )}
              {alt.cost && (
                <span style={{ color: T.accent, fontWeight: 700 }}>
                  ₩{alt.cost.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
