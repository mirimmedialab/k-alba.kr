"use client";
import { T } from "@/lib/theme";

/**
 * Skeleton / Wireframe 컴포넌트 모음 (McKinsey 팔레트 적용)
 * - 로딩 중 화면 밀림(레이아웃 시프트) 방지
 * - 실제 콘텐츠와 같은 shape/size로 점유
 */

export function Skel({ w = "100%", h = 16, r = 4, style }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background:
          "linear-gradient(90deg, #ECE7DC 0%, #F7F5F0 50%, #ECE7DC 100%)",
        backgroundSize: "200% 100%",
        animation: "kalbaShimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function CardSkel({ showFooter = true }) {
  return (
    <div
      style={{
        background: T.paper,
        borderRadius: 6,
        padding: "16px 18px",
        border: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Skel w="60%" h={15} style={{ marginBottom: 6 }} />
          <Skel w="40%" h={12} />
        </div>
        <Skel w={60} h={22} r={4} />
      </div>
      {showFooter && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <Skel w={90} h={14} />
          <Skel w={80} h={12} />
        </div>
      )}
    </div>
  );
}

export function ListPageSkel({
  maxWidth = 700,
  showAction = false,
  rows = 4,
}) {
  return (
    <div style={{ padding: 20, maxWidth, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <Skel w={180} h={24} style={{ marginBottom: 6 }} />
          <Skel w={100} h={14} />
        </div>
        {showAction && <Skel w={90} h={36} r={4} />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkel key={i} />
        ))}
      </div>
    </div>
  );
}

export function FormPageSkel({ maxWidth = 600, fields = 4 }) {
  return (
    <div style={{ padding: 20, maxWidth, margin: "0 auto" }}>
      <Skel w={80} h={14} style={{ marginBottom: 18 }} />
      <Skel w={220} h={24} style={{ marginBottom: 8 }} />
      <Skel w={260} h={14} style={{ marginBottom: 22 }} />

      <div
        style={{
          background: T.paper,
          borderRadius: 6,
          padding: 16,
          border: `1px solid ${T.border}`,
          marginBottom: 12,
        }}
      >
        <Skel w={120} h={14} style={{ marginBottom: 14 }} />
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <Skel w={80} h={12} style={{ marginBottom: 6 }} />
            <Skel h={42} r={4} />
          </div>
        ))}
      </div>

      <Skel h={44} r={4} />
    </div>
  );
}

export function ChatListSkel({ rows = 3 }) {
  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <Skel w={80} h={22} style={{ marginBottom: 6 }} />
      <Skel w={140} h={13} style={{ marginBottom: 20 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            style={{
              background: T.paper,
              borderRadius: 6,
              padding: "16px 18px",
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <Skel w={44} h={44} r={6} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Skel w={120} h={14} />
                <Skel w={40} h={11} />
              </div>
              <Skel w="70%" h={12} style={{ marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContractDetailSkel() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          background: T.paper,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Skel w={80} h={12} style={{ marginBottom: 10 }} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skel w={150} h={18} style={{ marginBottom: 6 }} />
            <Skel w={200} h={12} />
          </div>
          <Skel w={90} h={22} r={4} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          background: T.paper,
          borderBottom: `2px solid ${T.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ flex: 1, padding: "14px 8px", textAlign: "center" }}
          >
            <Skel w={80} h={14} style={{ margin: "0 auto" }} />
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 16, background: T.cream }}>
        {[240, 280, 200, 320].map((w, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 10,
              justifyContent: i % 3 === 2 ? "flex-end" : "flex-start",
            }}
          >
            {i % 3 !== 2 && <Skel w={32} h={32} r={6} />}
            <Skel
              w={w}
              h={50 + (i % 2) * 18}
              r={4}
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 100%)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NavAuthSkel() {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Skel w={40} h={28} r={4} />
      <Skel w={64} h={28} r={4} />
      <Skel w={70} h={28} r={4} />
    </div>
  );
}
