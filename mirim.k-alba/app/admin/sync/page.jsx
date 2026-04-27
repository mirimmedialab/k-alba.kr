"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { supabase, getCurrentUser } from "@/lib/supabase";

/**
 * /admin/sync — 공고 데이터 동기화 모니터링
 *
 * 표시:
 *   - WorkNet / AgriWork 최근 실행 이력
 *   - 소스별 현재 DB 공고 수
 *   - 수동 재실행 버튼 (트리거)
 *   - 실패 로그
 */
export default function AdminSyncPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [logs, setLogs] = useState([]);
  const [sourceCounts, setSourceCounts] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const role = user.user_metadata?.role || user.app_metadata?.role;
      if (role !== "admin") {
        router.push("/");
        return;
      }
      setAuthorized(true);
      await load();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    if (!supabase) return;

    const [logsResult, sourcesResult] = await Promise.all([
      supabase
        .from("sync_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30),
      supabase
        .from("jobs")
        .select("source_type"),
    ]);

    setLogs(logsResult.data || []);

    // 소스별 집계
    const counts = {};
    (sourcesResult.data || []).forEach((j) => {
      const s = j.source_type || "direct";
      counts[s] = (counts[s] || 0) + 1;
    });
    setSourceCounts(counts);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.ink3 }}>로딩 중...</div>;
  if (!authorized) return null;

  // 소스별 최신 로그 계산
  const latestByLource = {};
  logs.forEach((l) => {
    if (!latestByLource[l.source] ||
        new Date(l.started_at) > new Date(latestByLource[l.source].started_at)) {
      latestByLource[l.source] = l;
    }
  });

  return (
    <div style={{ padding: "32px 20px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/admin" style={{
        color: T.ink3,
        fontSize: 12,
        marginBottom: 18,
        display: "inline-block",
        textDecoration: "none",
        letterSpacing: "-0.01em",
      }}>
        ← 관리자 대시보드
      </Link>

      <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 18 }} />
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3,
        letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
      }}>
        Data Sync · 공고 동기화
      </div>
      <h1 style={{
        fontSize: 28, fontWeight: 800, color: T.ink,
        letterSpacing: "-0.025em", marginBottom: 6, lineHeight: 1.25,
      }}>
        공고 데이터 동기화 상태
      </h1>
      <p style={{ color: T.ink2, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
        매일 05:00 KST에 자동 실행됩니다. 수동 재실행도 가능합니다.
      </p>

      {/* 소스별 카드 */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
        marginBottom: 40,
      }}>
        <SourceCard
          name="WorkNet Open API"
          source="worknet"
          count={sourceCounts?.worknet || 0}
          lastLog={latestByLource.worknet}
        />
        <SourceCard
          name="AgriWork 크롤러"
          source="agriwork"
          count={sourceCounts?.agriwork || 0}
          lastLog={latestByLource.agriwork}
        />
        <SourceCard
          name="직접 등록"
          source="direct"
          count={sourceCounts?.direct || 0}
          lastLog={null}
          note="사장님이 post-job 페이지에서 직접 등록한 공고"
        />
      </div>

      {/* 최근 로그 */}
      <section>
        <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 14 }} />
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
        }}>
          Execution Log · 실행 로그
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: "-0.02em", marginBottom: 16 }}>
          최근 30건
        </h2>

        {logs.length === 0 ? (
          <div style={{
            padding: "48px 20px",
            background: T.cream,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            textAlign: "center",
            color: T.ink3,
            fontSize: 14,
          }}>
            아직 동기화 로그가 없습니다
          </div>
        ) : (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 4, overflow: "hidden" }}>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                padding: "14px 16px",
                borderBottom: i < logs.length - 1 ? `1px solid ${T.border}` : "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em", marginBottom: 2 }}>
                    {log.source}
                    <span style={{
                      marginLeft: 8,
                      padding: "1px 7px",
                      borderRadius: 2,
                      fontSize: 10,
                      fontWeight: 700,
                      background:
                        log.status === "success" ? "#E8F5EC" :
                        log.status === "failed" ? "#FEE" :
                        T.cream,
                      color:
                        log.status === "success" ? T.green :
                        log.status === "failed" ? "#A31919" :
                        T.ink2,
                    }}>
                      {log.status === "success" ? "✓ 성공" :
                       log.status === "failed" ? "✗ 실패" :
                       log.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: T.ink3 }}>
                    {new Date(log.started_at).toLocaleString("ko-KR")}
                    {log.completed_at && (
                      ` · ${Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000)}초 소요`
                    )}
                  </div>
                  {log.error && (
                    <div style={{ fontSize: 11, color: T.accent, marginTop: 4, fontFamily: "monospace" }}>
                      {log.error.slice(0, 100)}{log.error.length > 100 ? "..." : ""}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                  <span style={{ color: T.ink2 }}>
                    수집 <strong style={{ color: T.ink }}>{log.items_fetched || 0}</strong>
                  </span>
                  <span style={{ color: T.green }}>
                    신규 <strong>{log.items_new || 0}</strong>
                  </span>
                  {log.items_updated > 0 && (
                    <span style={{ color: T.ink2 }}>
                      갱신 <strong style={{ color: T.ink }}>{log.items_updated}</strong>
                    </span>
                  )}
                  {log.items_failed > 0 && (
                    <span style={{ color: T.accent }}>
                      실패 <strong>{log.items_failed}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 문제 해결 가이드 */}
      <div style={{
        marginTop: 32,
        padding: 20,
        background: T.cream,
        borderLeft: `3px solid ${T.accent}`,
        borderRadius: "0 4px 4px 0",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: T.ink3,
          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
        }}>
          💡 Troubleshooting · 문제 해결
        </div>
        <div style={{ fontSize: 12, color: T.ink2, lineHeight: 1.7 }}>
          • 동기화가 실행되지 않음 → Vercel Cron Jobs 설정 확인<br />
          • WorkNet 실패 반복 → <code style={{ background: T.paper, padding: "1px 4px", borderRadius: 2, fontSize: 11 }}>WORKNET_API_KEY</code> 환경변수 확인<br />
          • AgriWork Playwright 오류 → 프록시 설정 및 페이지 구조 변경 여부 점검<br />
          • 수집 건수 비정상 감소 → 원본 사이트 점검 중인지 확인
        </div>
      </div>
    </div>
  );
}

function SourceCard({ name, source, count, lastLog, note }) {
  return (
    <div style={{
      padding: 20,
      background: T.paper,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${T.gold}`,
      borderRadius: 4,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.ink3,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
        {source}
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 800,
        color: T.ink,
        letterSpacing: "-0.02em",
        marginBottom: 12,
      }}>
        {name}
      </div>
      <div style={{
        fontSize: 30,
        fontWeight: 800,
        color: T.ink,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {count.toLocaleString()}
        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginLeft: 4 }}>
          개
        </span>
      </div>
      <div style={{ fontSize: 11, color: T.ink3 }}>
        현재 DB 공고 수
      </div>
      {lastLog && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.border}`, fontSize: 11 }}>
          <div style={{ color: T.ink3, marginBottom: 2 }}>최근 실행</div>
          <div style={{ color: T.ink2 }}>
            {new Date(lastLog.started_at).toLocaleString("ko-KR")} · {lastLog.status}
          </div>
        </div>
      )}
      {note && (
        <div style={{ marginTop: 12, fontSize: 11, color: T.ink3, lineHeight: 1.5 }}>
          {note}
        </div>
      )}
    </div>
  );
}
