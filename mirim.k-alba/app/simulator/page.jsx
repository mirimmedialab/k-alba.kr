"use client";
import { Suspense } from "react";
export const dynamic = "force-dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { T } from "@/lib/theme";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "worker";
  const jobId = searchParams.get("job") || "k1";
  const autoStart = searchParams.get("autostart") || "1";
  const demo = searchParams.get("demo"); // "platform" | null

  const isPlatform = demo === "platform";
  const isWorker = mode === "worker";

  // 시뮬레이터 URL (query 파라미터를 그대로 전달)
  const query = new URLSearchParams();
  if (isPlatform) {
    query.set("demo", "platform");
  } else {
    query.set("mode", mode);
    query.set("job", jobId);
    query.set("autostart", autoStart);
  }
  const simulatorUrl = `/simulator.html?${query.toString()}`;

  // 공고 정보 (계약서 챗봇 모드용)
  const JOBS = {
    k1: { icon: "☕", title: "카페 바리스타", company: "블루보틀 강남점" },
    k2: { icon: "🌾", title: "딸기 수확 작업자", company: "논산 OO농장" },
    k3: { icon: "🍜", title: "한식당 서빙/주방보조", company: "이태원 정 본점" },
  };
  const job = JOBS[jobId] || JOBS.k1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      {/* 헤더 */}
      <div
        style={{
          background: "#fff",
          padding: "12px 20px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: T.ink2,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ←
          </button>
          {isPlatform ? (
            <>
              <div style={{ fontSize: 22 }}>🏢</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.n9, letterSpacing: "-0.02em" }}>
                  K-ALBA 플랫폼 데모
                </div>
                <div style={{ fontSize: 11, color: T.ink3 }}>
                  사장님 · 구직자 · 관리자 3-역할 시뮬
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24 }}>{job.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.n9, letterSpacing: "-0.02em" }}>
                  {isWorker ? "📝 알바생 지원/계약 챗봇" : "📝 사장님 채용/계약 챗봇"}
                </div>
                <div style={{ fontSize: 11, color: T.ink3 }}>
                  {job.company} · {job.title}
                </div>
              </div>
            </>
          )}
        </div>
        <div
          style={{
            padding: "5px 12px",
            borderRadius: 4,
            background: isPlatform ? T.n9 : (isWorker ? T.accentBg : "#FEF3C7"),
            color: isPlatform ? T.gold : (isWorker ? T.accent : "#F59E0B"),
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {isPlatform ? "🏢 Platform" : (isWorker ? "👤 알바생 모드" : "🧑‍💼 사장님 모드")}
        </div>
      </div>

      {/* 안내 배너 — 모드별로 다른 메시지 */}
      {!isPlatform && (
        <div
          style={{
            background: "#FEE500",
            padding: "10px 20px",
            fontSize: 12,
            color: "#1A1A2E",
            fontWeight: 600,
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          💡 카카오톡 챗봇으로 진행됩니다 — <strong>'▶ 다음 단계'</strong> 버튼을 눌러서 진행하세요!
        </div>
      )}
      {isPlatform && (
        <div
          style={{
            background: T.n9,
            padding: "10px 20px",
            fontSize: 12,
            color: T.paper,
            fontWeight: 500,
            textAlign: "center",
            flexShrink: 0,
            letterSpacing: "-0.01em",
            borderTop: `2px solid ${T.gold}`,
          }}
        >
          💡 상단 <strong style={{ color: T.gold }}>역할 탭</strong>으로 사장님 / 구직자 / 관리자 화면을 전환하며 체험하세요
        </div>
      )}

      {/* 시뮬레이터 iframe */}
      <iframe
        src={simulatorUrl}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: isPlatform ? "#1A1A18" : "#EDEDEA",
        }}
        title={isPlatform ? "K-ALBA 플랫폼 데모" : "K-ALBA 챗봇 시뮬레이터"}
      />
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center", color: "#6B7A95" }}>
          시뮬레이터 로딩 중...
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}
