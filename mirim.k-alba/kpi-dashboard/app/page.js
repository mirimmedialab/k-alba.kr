"use client";

import { useEffect, useState } from "react";

const NAVY = "#1a2340";
const CORAL = "#ff6b5e";
const MUTED = "#8a93a8";
const BORDER = "#e6eaf2";

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${BORDER}`,
        padding: 20,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, sub, accent }) {
  return (
    <Card style={{ flex: "1 1 150px", minWidth: 150 }}>
      <div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{label}</div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: accent ? CORAL : NAVY,
          marginTop: 6,
          lineHeight: 1.1,
        }}
      >
        {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

function LinkStat({ href, label, value, sub }) {
  const color = CORAL; // 클릭 가능한 카드는 모두 '발행 콘텐츠'와 동일한 스타일
  return (
    <a
      href={href}
      style={{ flex: "1 1 150px", minWidth: 150, textDecoration: "none", cursor: "pointer" }}
    >
      <Card
        style={{
          border: `1.5px solid ${color}`,
          height: "100%",
          boxSizing: "border-box",
          boxShadow: "0 2px 10px rgba(255,107,94,0.12)",
        }}
      >
        <div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 30, fontWeight: 800, color, marginTop: 6, lineHeight: 1.1 }}>
          {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 8,
            background: color,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 20,
          }}
        >
          {sub || "상세 보기"} →
        </div>
      </Card>
    </a>
  );
}

function WeeklyBars({ title, series, color }) {
  const data = series || [];
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 120;
  const bw = data.length ? W / data.length : W;
  return (
    <Card style={{ flex: "1 1 340px", minWidth: 300 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
        {title} <span style={{ color: MUTED, fontWeight: 500 }}>· 최근 12주</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 24}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {data.map((d, i) => {
          const h = Math.round((d.count / max) * (H - 16));
          return (
            <g key={d.week}>
              <rect
                x={i * bw + bw * 0.18}
                y={H - h}
                width={bw * 0.64}
                height={Math.max(h, d.count > 0 ? 3 : 1)}
                rx={3}
                fill={d.count > 0 ? color : "#eef1f7"}
              />
              {d.count > 0 && (
                <text
                  x={i * bw + bw / 2}
                  y={H - h - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={NAVY}
                >
                  {d.count}
                </text>
              )}
              <text
                x={i * bw + bw / 2}
                y={H + 16}
                textAnchor="middle"
                fontSize="9"
                fill={MUTED}
              >
                {d.week.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

function HBars({ title, data, color, note }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <Card style={{ flex: "1 1 260px", minWidth: 240 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 12 }}>{title}</div>
      {entries.length === 0 && <div style={{ fontSize: 13, color: MUTED }}>데이터 없음</div>}
      {entries.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            <span style={{ color: NAVY, fontWeight: 600 }}>{k}</span>
            <span style={{ color: MUTED, fontWeight: 700 }}>{v.toLocaleString()}</span>
          </div>
          <div style={{ background: "#eef1f7", borderRadius: 6, height: 8 }}>
            <div
              style={{
                width: `${Math.round((v / max) * 100)}%`,
                background: color,
                height: 8,
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
      {note && <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>{note}</div>}
    </Card>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: NAVY }}>{title}</span>
        {sub && <span style={{ fontSize: 13, color: MUTED, marginLeft: 10 }}>{sub}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{children}</div>
    </div>
  );
}

function BestList({ items }) {
  const [metric, setMetric] = useState("views");
  const METRICS = [
    ["views", "조회수", "회"],
    ["likes", "좋아요", "개"],
    ["comments", "댓글", "개"],
    ["shares", "공유", "회"],
  ];
  const unit = (METRICS.find(([k]) => k === metric) || [])[2] || "";
  const list = (items || [])
    .filter((it) => typeof it[metric] === "number")
    .slice()
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 5);
  const max = Math.max(1, ...list.map((it) => it[metric] || 0));
  return (
    <Card style={{ flex: "1 1 340px", minWidth: 300 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>
          BEST 콘텐츠 <span style={{ color: MUTED, fontWeight: 500 }}>· TOP 5</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {METRICS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              style={{
                padding: "4px 10px",
                borderRadius: 14,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                border: `1px solid ${metric === k ? CORAL : BORDER}`,
                background: metric === k ? CORAL : "#fff",
                color: metric === k ? "#fff" : MUTED,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 && (
        <div style={{ fontSize: 13, color: MUTED }}>해당 수치가 입력된 콘텐츠가 없습니다.</div>
      )}
      {list.map((it, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: i === 0 ? CORAL : "#eef1f7",
                color: i === 0 ? "#fff" : MUTED,
                fontSize: 11,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontSize: 13,
                color: NAVY,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {it.title || "(제목 없음)"}
            </span>
            <span style={{ fontSize: 13, color: MUTED, fontWeight: 700, flexShrink: 0 }}>
              {(it[metric] || 0).toLocaleString()}
              {unit}
            </span>
          </div>
          <div style={{ background: "#eef1f7", borderRadius: 6, height: 6, marginLeft: 28 }}>
            <div
              style={{
                width: `${Math.round(((it[metric] || 0) / max) * 100)}%`,
                background: NAVY,
                height: 6,
                borderRadius: 6,
              }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        background: "#fff4f3",
        border: "1px solid #ffd6d2",
        color: "#c0392b",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        marginBottom: 14,
        width: "100%",
      }}
    >
      ⚠️ {msg}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/kpi")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return <div style={{ padding: 40, color: "#c0392b" }}>불러오기 실패: {error}</div>;
  }
  if (!data) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 15 }}>
        KPI 데이터를 불러오는 중…
      </div>
    );
  }

  const u = data.users || {};
  const j = data.jobs || {};
  const m = data.matching || {};
  const c = data.content || null;
  const mk = data.marketing || null;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 60px" }}>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>
          K-ALBA <span style={{ color: CORAL }}>KPI</span> 대시보드
        </div>
        <div style={{ fontSize: 12, color: MUTED }}>
          업데이트: {new Date(data.generatedAt).toLocaleString("ko-KR")}
        </div>
      </div>

      <ErrorNote msg={data.dbError} />

      {/* ① 성장 */}
      <Section title="① 성장 · 사용자" sub="Supabase 실DB 자동 집계">
        <LinkStat href="/users" label="전체 가입자" value={u.total} accent sub="달력·명단 보기" />
        <Stat label="알바생 (worker)" value={u.workers} />
        <Stat label="사장님 (employer)" value={u.employers} />
        <Stat label="탈퇴(비활성화)" value={u.deactivations} />
        <WeeklyBars title="주간 신규 알바생" series={u.weeklyWorkers} color={NAVY} />
        <WeeklyBars title="주간 신규 사장님" series={u.weeklyEmployers} color={CORAL} />
      </Section>

      {/* ② 공급 */}
      <Section title="② 공급 · 공고" sub="jobs 테이블">
        <Stat label="활성 공고" value={j.active} accent />
        <Stat label="누적 공고" value={j.total} />
        <LinkStat href="/jobs-manual?src=direct" label="직접 등록" value={j.bySource ? j.bySource.direct : null} sub="공고 목록" />
        <LinkStat href="/jobs-manual?src=chatbot" label="챗봇 등록" value={j.bySource ? j.bySource.chatbot : null} sub="공고 목록" />
        <WeeklyBars title="주간 신규 공고" series={j.weeklyNew} color={NAVY} />
        <HBars
          title="공고 소스 비중"
          data={j.bySource || {}}
          color={CORAL}
          note="worknet=고용24 연동 · direct=직접 등록 · chatbot=카카오 챗봇"
        />
      </Section>

      {/* ③ 매칭 */}
      <Section title="③ 매칭 · 핵심 성과" sub="지원 → 계약 퍼널">
        <LinkStat href="/applications" label="누적 지원" value={m.applications} accent sub="지원 내역" />
        <LinkStat href="/favorites" label="관심공고 저장" value={m.favorites} sub="저장 목록" />
        <Stat label="계약 체결" value={m.contracts} />
        <Stat label="시간제취업 신청" value={m.partwork} />
        <WeeklyBars title="주간 지원 수" series={m.weeklyApplications} color={CORAL} />
      </Section>

      {/* ④ 마케팅 */}
      <Section title="④ 마케팅 채널" sub="구글시트 [K-ABLA]Content · [K-ALBA]성과 탭 자동 연동">
        <ErrorNote msg={data.contentError} />
        <ErrorNote msg={data.metricsError} />
        <LinkStat
          href="/marketing"
          label="발행 콘텐츠"
          value={c ? c.published : null}
          accent
          sub="전체 리스트 보기"
        />
        <Stat label="총 조회수" value={mk ? mk.totalViews : null} sub="게시물별 최신 조회수 합" />
        <Stat label="총 좋아요" value={mk ? mk.totalLikes : null} />
        <Stat label="총 댓글" value={mk ? mk.totalComments : null} />
        {mk && <WeeklyBars title="주간 조회수" series={mk.weeklyViews} color={CORAL} />}
        {mk && <BestList items={mk.items} />}
        {c && <HBars title="채널별 발행" data={c.byChannel} color={NAVY} />}
      </Section>
    </div>
  );
}
