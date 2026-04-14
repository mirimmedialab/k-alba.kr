"use client";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";

function SimulatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode") || "worker";
  const jobId = searchParams.get("job") || "k1";
  const autoStart = searchParams.get("autostart") || "1";

  const isWorker = mode === "worker";

  // 시뮬레이터 URL (Next.js public 폴더의 정적 HTML)
  const simulatorUrl = `/simulator.html?mode=${mode}&job=${jobId}&autostart=${autoStart}`;

  // 공고 정보 (시뮬레이터의 KALBA_JOBS와 동일)
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
          borderBottom: `1px solid ${T.g200}`,
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
              color: T.g700,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ←
          </button>
          <div style={{ fontSize: 24 }}>{job.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.navy }}>
              {isWorker ? "📝 알바생 지원/계약 챗봇" : "📝 사장님 채용/계약 챗봇"}
            </div>
            <div style={{ fontSize: 11, color: T.g500 }}>
              {job.company} · {job.title}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            background: isWorker ? T.coralL : "#FEF3C7",
            color: isWorker ? T.coral : "#F59E0B",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {isWorker ? "👤 알바생 모드" : "🧑‍💼 사장님 모드"}
        </div>
      </div>

      {/* 안내 배너 */}
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

      {/* 시뮬레이터 iframe */}
      <iframe
        src={simulatorUrl}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          background: "#EDEDEA",
        }}
        title="K-ALBA 챗봇 시뮬레이터"
      />
    </div>
  );
}

export default function SimulatorPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 40, textAlign: "center" }}>
          시뮬레이터 로딩 중...
        </div>
      }
    >
      <SimulatorContent />
    </Suspense>
  );
}
