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
      <Card style={{ position: "relative", border: "2px solid #c8d0da" }}>
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

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function fmtMD(dateStr) {
  return `${+dateStr.slice(5, 7)}/${+dateStr.slice(8, 10)}`;
}

function DailyChart({ title, series, color, pointHref }) {
  const [offset, setOffset] = useState(0);
  const data = series || [];
  const maxOffset = Math.max(0, Math.floor(data.length / 7) - 1);
  const end = data.length - offset * 7;
  const win = data.slice(Math.max(0, end - 7), end);
  const max = Math.max(1, ...win.map((d) => d.count));
  const W = 560;
  const H = 180;
  const P = { t: 26, r: 16, b: 34, l: 16 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;
  const x = (i) => P.l + (win.length > 1 ? (i / (win.length - 1)) * iw : iw / 2);
  const y = (v) => P.t + ih - (v / max) * ih;
  const pts = win.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");
  const area = `M ${P.l},${P.t + ih} L ${pts.split(" ").join(" L ")} L ${x(win.length - 1)},${
    P.t + ih
  } Z`;
  const range = win.length ? `${fmtMD(win[0].date)} – ${fmtMD(win[win.length - 1].date)}` : "";
  const navBtn = (disabled) => ({
    border: `1px solid ${BORDER}`,
    background: "#fff",
    color: disabled ? "#d3d9e0" : MUTED,
    borderRadius: 7,
    width: 24,
    height: 24,
    fontSize: 13,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    padding: 0,
  });
  return (
    <Card>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            style={navBtn(offset >= maxOffset)}
            disabled={offset >= maxOffset}
            onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
          >
            ‹
          </button>
          <span
            style={{
              fontSize: 12,
              color: MUTED,
              minWidth: 86,
              textAlign: "center",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {range}
          </span>
          <button
            style={navBtn(offset <= 0)}
            disabled={offset <= 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
          >
            ›
          </button>
        </div>
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
        {win.length > 0 && (
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
            {win.map((d, i) => {
              if (d.count <= 0) return null;
              const dot = (
                <g style={pointHref ? { cursor: "pointer" } : undefined}>
                  <circle cx={x(i)} cy={y(d.count)} r="10" fill="transparent" />
                  <circle cx={x(i)} cy={y(d.count)} r="3" fill={color} />
                  <text
                    x={Math.max(P.l + 12, Math.min(x(i), P.l + iw - 12))}
                    y={y(d.count) - 9}
                    textAnchor="middle"
                    fontSize="12.5"
                    fontWeight="600"
                    fill={INK}
                  >
                    {d.count.toLocaleString()}
                  </text>
                </g>
              );
              return pointHref ? (
                <a key={`v${d.date}`} href={pointHref(d)}>
                  {dot}
                </a>
              ) : (
                <g key={`v${d.date}`}>{dot}</g>
              );
            })}
            {win.map((d, i) => {
              const dow = new Date(d.date).getUTCDay();
              return (
                <g key={`x${d.date}`}>
                  <text
                    x={x(i)}
                    y={H - 19}
                    textAnchor="middle"
                    fontSize="11.5"
                    fill={INK}
                    fontWeight="500"
                  >
                    {fmtMD(d.date)}
                  </text>
                  <text
                    x={x(i)}
                    y={H - 5}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill={dow === 0 ? ACCENT : MUTED}
                  >
                    {DOW[dow]}
                  </text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </Card>
  );
}

function MiniGrid({ title, entries, vertical }) {
  return (
    <Card>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: INK, marginBottom: 14 }}>{title}</div>
      {vertical ? (
        <div>
          {entries.map(([label, value, href], i) => {
            const row = (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "10px 2px",
                  borderBottom: i < entries.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <span style={{ fontSize: 13, color: MUTED }}>
                  {label}
                  {href && <span style={{ marginLeft: 6, fontSize: 12 }}>→</span>}
                </span>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: INK,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value === null || value === undefined ? "–" : Number(value).toLocaleString()}
                </span>
              </div>
            );
            return href ? (
              <a key={label} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                {row}
              </a>
            ) : (
              <div key={label}>{row}</div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)`,
            gap: 10,
          }}
        >
          {entries.map(([label, value, href]) => {
            const cell = (
              <div style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: 10 }}>
                <div style={{ fontSize: 12, color: MUTED }}>
                  {label}
                  {href && <span style={{ marginLeft: 5, fontSize: 11 }}>→</span>}
                </div>
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
            );
            return href ? (
              <a key={label} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                {cell}
              </a>
            ) : (
              <div key={label}>{cell}</div>
            );
          })}
        </div>
      )}
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
        <a
          key={i}
          href={`/marketing?q=${encodeURIComponent(it.title || "")}`}
          style={{ display: "block", marginBottom: 11, textDecoration: "none", color: "inherit" }}
        >
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
        </a>
      ))}
    </Card>
  );
}

function Section({ num, title, first, children }) {
  return (
    <section
      style={{
        marginBottom: 48,
        paddingTop: first ? 0 : 36,
        borderTop: first ? "none" : `1px solid ${BORDER}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: INK,
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {num}
        </span>
        <span style={{ fontSize: 19, fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>
          {title}
        </span>
      </div>
      {children}
    </section>
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
  const n = (v) => (typeof v === "number" ? v.toLocaleString() : "–");

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

      <Section num="1" title="성장 · 사용자" first>
        <MiniGrid
          title="가입 현황"
          entries={[
            ["전체 가입자", u.total, "/users"],
            ["알바생", u.workers],
            ["사장님", u.employers],
            ["탈퇴", u.deactivations],
          ]}
        />
        <div className="row-1-1" style={{ marginTop: 12 }}>
          <DailyChart title="신규 알바생" series={u.dailyWorkers} color={ACCENT} />
          <DailyChart title="신규 사장님" series={u.dailyEmployers} color={INK} />
        </div>
      </Section>

      <Section num="2" title="공급 · 공고">
        <div className="row-1-2">
          <MiniGrid
            title="공고"
            vertical
            entries={[
              ["고용24 공고", j.bySource ? j.bySource.worknet : null],
              ["직접 등록 공고", j.bySource ? j.bySource.direct : null, "/jobs-manual?src=direct"],
              ["챗봇 등록 공고", j.bySource ? j.bySource.chatbot : null, "/jobs-manual?src=chatbot"],
              ["누적 공고", j.total],
            ]}
          />
          <DailyChart title="신규 공고" series={j.dailyNew} color={ACCENT} />
        </div>
      </Section>

      <Section num="3" title="매칭 · 핵심 성과">
        <div className="row-1-1">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <LinkStat href="/applications" label="누적 지원" value={m.applications} sub="지원 내역" />
            <LinkStat href="/favorites" label="관심공고 저장" value={m.favorites} sub="저장 목록" />
            <Stat label="계약 체결" value={m.contracts} />
            <Stat label="시간제취업 신청" value={m.partwork} />
          </div>
          <DailyChart title="지원 수" series={m.dailyApplications} color={ACCENT} />
        </div>
      </Section>

      <Section num="4" title="마케팅 채널">
        <ErrorNote msg={data.contentError} />
        <ErrorNote msg={data.metricsError} />
        <MiniGrid
          title="콘텐츠 성과"
          entries={[
            ["발행 콘텐츠", c ? c.published : null, "/marketing"],
            ["총 조회수", mk ? mk.totalViews : null],
            ["총 좋아요", mk ? mk.totalLikes : null],
            ["총 댓글", mk ? mk.totalComments : null],
          ]}
        />
        <div className="row-2-1" style={{ marginTop: 12 }}>
          {mk && <DailyChart title="일별 조회수" series={mk.dailyViews} color={ACCENT} pointHref={(d) => `/marketing?date=${d.date}`} />}
          {mk && <BestList items={mk.items} />}
        </div>
        <div style={{ marginTop: 12 }}>
          <MiniGrid
            title="채널별 발행"
            entries={[
              ["틱톡", ch["틱톡"] || 0, "/marketing?ch=틱톡"],
              ["페이스북", ch["페이스북"] || 0, "/marketing?ch=페이스북"],
              ["인스타그램", ch["인스타그램"] || 0, "/marketing?ch=인스타그램"],
              ["스레드", ch["스레드"] || 0, "/marketing?ch=스레드"],
            ]}
          />
        </div>
      </Section>
    </div>
  );
}
