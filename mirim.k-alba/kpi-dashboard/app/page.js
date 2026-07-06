"use client";

import { useEffect, useState } from "react";

const INK = "#191f28";
const MUTED = "#8b95a1";
const BORDER = "#eceef1";
const ACCENT = "#ff6b5e";
const FILL = "#f2f4f6";

function Card({ children, style }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <Card>
      <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 500 }}>{label}</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: INK,
          marginTop: 6,
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>{sub}</div>}
    </Card>
  );
}

function LinkStat({ href, label, value, sub }) {
  return (
    <a className="cardlink" href={href}>
      <Card style={{ position: "relative" }}>
        <span
          className="arrow"
          style={{ position: "absolute", top: 16, right: 18, color: MUTED, fontSize: 15 }}
        >
          →
        </span>
        <div style={{ fontSize: 12.5, color: MUTED, fontWeight: 500 }}>{label}</div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: INK,
            marginTop: 6,
            lineHeight: 1.15,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 5 }}>{sub || "상세 보기"}</div>
      </Card>
    </a>
  );
}

function TrendChart({ title, series, color }) {
  const data = series || [];
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 150;
  const P = { t: 16, r: 10, b: 22, l: 10 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const x = (i) => P.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2);
  const y = (v) => P.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");
  const area = `M ${P.l},${P.t + ih} L ${pts.split(" ").join(" L ")} L ${P.l + iw},${P.t + ih} Z`;
  const last = data.length - 1;
  return (
    <Card>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, marginBottom: 10 }}>
        {title} <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>최근 12주</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 0.5, 1].map((r) => (
          <line
            key={r}
            x1={P.l}
            x2={P.l + iw}
            y1={P.t + ih * r}
            y2={P.t + ih * r}
            stroke={BORDER}
            strokeWidth="1"
          />
        ))}
        {data.length > 0 && (
          <>
            <path d={area} fill={color} opacity="0.08" />
            <polyline
              points={pts}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {data[last] && data[last].count > 0 && (
              <>
                <circle cx={x(last)} cy={y(data[last].count)} r="3.5" fill={color} />
                <text
                  x={Math.min(x(last), P.l + iw - 8)}
                  y={y(data[last].count) - 8}
                  textAnchor="end"
                  fontSize="11"
                  fontWeight="600"
                  fill={INK}
                >
                  {data[last].count.toLocaleString()}
                </text>
              </>
            )}
            {data.map((d, i) =>
              i % 2 === 0 ? (
                <text
                  key={d.week}
                  x={x(i)}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={MUTED}
                >
                  {d.week.slice(5)}
                </text>
              ) : null
            )}
          </>
        )}
      </svg>
    </Card>
  );
}

function MiniGrid({ title, entries }) {
  return (
    <Card>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, marginBottom: 14 }}>{title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)`,
          gap: 10,
        }}
      >
        {entries.map(([label, value]) => (
          <div key={label} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: 10 }}>
            <div style={{ fontSize: 12, color: MUTED }}>{label}</div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 700,
                color: INK,
                marginTop: 3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BestList({ items }) {
  const [metric, setMetric] = useState("views");
  const METRICS = [
    ["views", "조회수"],
    ["likes", "좋아요"],
    ["comments", "댓글"],
    ["shares", "공유"],
  ];
  const list = (items || [])
    .filter((it) => typeof it[metric] === "number")
    .slice()
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 5);
  const max = Math.max(1, ...list.map((it) => it[metric] || 0));
  return (
    <Card>
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
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>BEST 콘텐츠</div>
        <div style={{ display: "flex", gap: 2 }}>
          {METRICS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMetric(k)}
              style={{
                padding: "4px 9px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: metric === k ? 600 : 400,
                cursor: "pointer",
                border: "none",
                background: metric === k ? FILL : "transparent",
                color: metric === k ? INK : MUTED,
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
        <div key={i} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: i === 0 ? ACCENT : MUTED,
                width: 14,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {i + 1}
            </span>
            <span
              style={{
                fontSize: 13,
                color: INK,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {it.title || "(제목 없음)"}
            </span>
            <span
              style={{
                fontSize: 12.5,
                color: INK,
                fontWeight: 600,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {(it[metric] || 0).toLocaleString()}
            </span>
          </div>
          <div style={{ background: FILL, borderRadius: 4, height: 4, marginLeft: 24 }}>
            <div
              style={{
                width: `${Math.round(((it[metric] || 0) / max) * 100)}%`,
                background: ACCENT,
                height: 4,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
    </Card>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function StatGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function ChartGrid({ children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 12,
        marginTop: 12,
      }}
    >
      {children}
    </div>
  );
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        background: "#fff7f6",
        border: "1px solid #ffe0dc",
        color: "#c0392b",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
        marginBottom: 12,
      }}
    >
      {msg}
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
      <div style={{ padding: 60, textAlign: "center", color: MUTED, fontSize: 14 }}>
        KPI 데이터를 불러오는 중…
      </div>
    );
  }

  const u = data.users || {};
  const j = data.jobs || {};
  const m = data.matching || {};
  const c = data.content || null;
  const mk = data.marketing || null;
  const ch = (c && c.byChannel) || {};

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 20px 64px" }}>
      {/* 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>
          K-ALBA <span style={{ color: ACCENT }}>KPI</span>
        </div>
        <div style={{ fontSize: 12, color: MUTED }}>
          업데이트 {new Date(data.generatedAt).toLocaleString("ko-KR")}
        </div>
      </div>

      <ErrorNote msg={data.dbError} />

      <Section title="① 성장 · 사용자">
        <StatGrid>
          <LinkStat href="/users" label="전체 가입자" value={u.total} sub="달력 · 명단" />
          <Stat label="알바생" value={u.workers} />
          <Stat label="사장님" value={u.employers} />
          <Stat label="탈퇴" value={u.deactivations} />
        </StatGrid>
        <ChartGrid>
          <TrendChart title="주간 신규 알바생" series={u.weeklyWorkers} color={ACCENT} />
          <TrendChart title="주간 신규 사장님" series={u.weeklyEmployers} color={INK} />
        </ChartGrid>
      </Section>

      <Section title="② 공급 · 공고">
        <StatGrid>
          <Stat label="활성 공고" value={j.active} />
          <Stat label="누적 공고" value={j.total} />
          <LinkStat
            href="/jobs-manual?src=direct"
            label="직접 등록"
            value={j.bySource ? j.bySource.direct : null}
            sub="공고 목록"
          />
          <LinkStat
            href="/jobs-manual?src=chatbot"
            label="챗봇 등록"
            value={j.bySource ? j.bySource.chatbot : null}
            sub="공고 목록"
          />
        </StatGrid>
        <ChartGrid>
          <TrendChart title="주간 신규 공고" series={j.weeklyNew} color={ACCENT} />
          <MiniGrid
            title="공고 소스"
            entries={[
              ["고용24", j.bySource ? j.bySource.worknet : null],
              ["직접 등록", j.bySource ? j.bySource.direct : null],
              ["챗봇 등록", j.bySource ? j.bySource.chatbot : null],
            ]}
          />
        </ChartGrid>
      </Section>

      <Section title="③ 매칭 · 핵심 성과">
        <StatGrid>
          <LinkStat href="/applications" label="누적 지원" value={m.applications} sub="지원 내역" />
          <LinkStat href="/favorites" label="관심공고 저장" value={m.favorites} sub="저장 목록" />
          <Stat label="계약 체결" value={m.contracts} />
          <Stat label="시간제취업 신청" value={m.partwork} />
        </StatGrid>
        <ChartGrid>
          <TrendChart title="주간 지원 수" series={m.weeklyApplications} color={ACCENT} />
        </ChartGrid>
      </Section>

      <Section title="④ 마케팅 채널">
        <ErrorNote msg={data.contentError} />
        <ErrorNote msg={data.metricsError} />
        <StatGrid>
          <LinkStat
            href="/marketing"
            label="발행 콘텐츠"
            value={c ? c.published : null}
            sub="전체 리스트"
          />
          <Stat label="총 조회수" value={mk ? mk.totalViews : null} />
          <Stat label="총 좋아요" value={mk ? mk.totalLikes : null} />
          <Stat label="총 댓글" value={mk ? mk.totalComments : null} />
        </StatGrid>
        <ChartGrid>
          {mk && <TrendChart title="주간 조회수" series={mk.weeklyViews} color={ACCENT} />}
          {mk && <BestList items={mk.items} />}
          <MiniGrid
            title="채널별 발행"
            entries={[
              ["틱톡", ch["틱톡"] || 0],
              ["페이스북", ch["페이스북"] || 0],
              ["인스타그램", ch["인스타그램"] || 0],
              ["스레드", ch["스레드"] || 0],
            ]}
          />
        </ChartGrid>
      </Section>
    </div>
  );
}
