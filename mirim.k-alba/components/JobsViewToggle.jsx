"use client";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n";
import { T } from "@/lib/theme";
import { viewLabel } from "@/lib/jobI18n";

/**
 * 공고 목록 ↔ 지도 전환 토글 (세그먼트 컨트롤)
 * - /jobs 와 /jobs/map 상단에 동일하게 배치 → 같은 위치에서 뷰만 바뀌는 느낌
 * - 로그인 없이도 동작(두 경로 모두 공개)
 * props: current = "list" | "map"
 */
export default function JobsViewToggle({ current = "list", style }) {
  const router = useRouter();
  const { locale } = useLocale();

  const Seg = ({ view, href, icon }) => {
    const active = current === view;
    return (
      <button
        type="button"
        onClick={() => { if (!active) router.push(href); }}
        aria-pressed={active}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 0",
          border: "none",
          borderRadius: 999,
          cursor: active ? "default" : "pointer",
          background: active ? T.accentBg : "transparent",
          color: active ? T.accent : T.ink3,
          fontWeight: active ? 800 : 600,
          fontSize: 13,
          fontFamily: "inherit",
          letterSpacing: "-0.01em",
          transition: "background 0.15s, color 0.15s",
        }}
      >
        <span aria-hidden="true">{icon}</span> {viewLabel(view, locale)}
      </button>
    );
  };

  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 2,
        padding: 3,
        background: T.paper,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        ...style,
      }}
    >
      <Seg view="list" href="/jobs" icon="📋" />
      <Seg view="map" href="/jobs/map" icon="🗺️" />
    </div>
  );
}
