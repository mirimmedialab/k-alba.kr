"use client";
import { T } from "@/lib/theme";

/** 공용 카드 컨테이너 */
export function Panel({ title, right, children, style }) {
  return (
    <section
      style={{
        background: T.paper,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: T.ink, margin: 0 }}>{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** 지표 카드 */
export function Stat({ label, value, sub, accent = T.coral }) {
  return (
    <div
      style={{
        background: T.paper,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        flex: "1 1 0",
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 12, color: T.ink3, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1.2, marginTop: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** 상태 배지 (라벨별 색상 매핑) */
const STATUS_MAP = {
  active: { bg: T.successBg, fg: "#0A8F6B", label: "활성" },
  closed: { bg: T.g100, fg: T.ink2, label: "마감" },
  hidden: { bg: T.warningBg, fg: "#92600A", label: "숨김" },
  deleted: { bg: T.errorBg, fg: T.error, label: "삭제" },
  pending: { bg: T.warningBg, fg: "#92600A", label: "대기" },
  approved: { bg: T.successBg, fg: "#0A8F6B", label: "승인" },
  completed: { bg: T.successBg, fg: "#0A8F6B", label: "완료" },
  rejected: { bg: T.errorBg, fg: T.error, label: "거절" },
  reviewing: { bg: T.infoBg, fg: T.info, label: "검토중" },
  success: { bg: T.successBg, fg: "#0A8F6B", label: "성공" },
  failed: { bg: T.errorBg, fg: T.error, label: "실패" },
  error: { bg: T.errorBg, fg: T.error, label: "오류" },
  running: { bg: T.infoBg, fg: T.info, label: "진행중" },
};
export function StatusBadge({ value }) {
  const m = STATUS_MAP[value] || { bg: T.g100, fg: T.ink2, label: value || "-" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </span>
  );
}

/** 데스크탑 테이블 */
export function Table({ columns, rows, empty = "데이터가 없습니다." }) {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: "40px 18px", textAlign: "center", color: T.ink3 }}>{empty}</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: T.g50 }}>
            {columns.map((c, i) => (
              <th
                key={i}
                style={{
                  textAlign: c.align || "left",
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.ink3,
                  borderBottom: `1px solid ${T.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id ?? ri} style={{ borderBottom: `1px solid ${T.border}` }}>
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "11px 14px",
                    color: T.ink,
                    textAlign: c.align || "left",
                    verticalAlign: "middle",
                    whiteSpace: c.wrap ? "normal" : "nowrap",
                    maxWidth: c.maxWidth || "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {c.cell ? c.cell(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 작은 액션 버튼 */
export function MiniBtn({ children, onClick, tone = "default", disabled }) {
  const tones = {
    default: { bg: T.paper, fg: T.ink2, border: T.borderStrong },
    primary: { bg: T.coral, fg: "#fff", border: T.coral },
    danger: { bg: T.paper, fg: T.error, border: "#F3C0C0" },
    success: { bg: T.paper, fg: "#0A8F6B", border: "#A6E6D2" },
  };
  const s = tones[tone] || tones.default;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "5px 10px",
        borderRadius: 7,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

/** 페이지네이션 */
export function Pager({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", padding: 14 }}>
      <MiniBtn onClick={() => onPage(page - 1)} disabled={page <= 1}>이전</MiniBtn>
      <span style={{ fontSize: 13, color: T.ink2 }}>
        {page} / {pages} <span style={{ color: T.ink3 }}>(총 {total.toLocaleString()})</span>
      </span>
      <MiniBtn onClick={() => onPage(page + 1)} disabled={page >= pages}>다음</MiniBtn>
    </div>
  );
}

/** 검색/필터 툴바 입력 */
export function TextInput({ value, onChange, placeholder, onEnter, style }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
      placeholder={placeholder}
      style={{
        fontSize: 13,
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${T.borderStrong}`,
        outline: "none",
        minWidth: 220,
        ...style,
      }}
    />
  );
}

export function SelectInput({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 13,
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${T.borderStrong}`,
        background: T.paper,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function fmtDate(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch (_) { return "-"; }
}

export function fmtPay(type, amount) {
  if (!amount) return "-";
  const won = Number(amount).toLocaleString();
  const label = type === "hourly" ? "시급" : type === "monthly" ? "월급" : type === "daily" ? "일급" : "";
  return `${label} ${won}원`;
}
