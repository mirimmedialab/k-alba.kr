import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const WEEKS = 12;
const DEFAULT_SHEET_ID = "1cgYYoJk5O7mJsmA-maZAMbNE8z6PV750-22hjDZvpYw";
const DEFAULT_CONTENT_GID = "1923809566";

/* ---------- 주간 시계열 ---------- */
function weekStart(d) {
  const dt = new Date(d);
  const day = (dt.getUTCDay() + 6) % 7; // 월요일 시작
  dt.setUTCDate(dt.getUTCDate() - day);
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}
function weekKey(d) {
  return weekStart(d).toISOString().slice(0, 10);
}
function buildWeeklySeries(rows, weeks) {
  const map = {};
  for (const r of rows || []) {
    if (!r || !r.created_at) continue;
    const k = weekKey(r.created_at);
    map[k] = (map[k] || 0) + 1;
  }
  const out = [];
  const now = weekStart(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const k = d.toISOString().slice(0, 10);
    out.push({ week: k, count: map[k] || 0 });
  }
  return out;
}

/* ---------- CSV 파서 ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

async function fetchSheetCsv(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow", cache: "no-store" });
  if (!res.ok) throw new Error(`구글시트 응답 오류 (${res.status})`);
  return parseCsv(await res.text());
}

/* ---------- 콘텐츠 발행 리스트 분석 ---------- */
function analyzeContent(rows) {
  const norm = (s) => String(s || "").replace(/\s/g, "");
  const hi = rows.findIndex(
    (r) => r.some((c) => norm(c) === "채널") && r.some((c) => norm(c) === "발행상태")
  );
  if (hi < 0) return null;
  const header = rows[hi].map(norm);
  const idx = (name) => header.indexOf(name);
  const chI = idx("채널");
  const stI = idx("발행상태");
  const catI = idx("분류");
  const dateI = idx("날짜");
  // 발행완료된 콘텐츠만 집계 (아이디어/계획/미발행 백로그는 KPI에서 제외)
  const posts = [];
  for (const r of rows.slice(hi + 1)) {
    const ch = String(r[chI] || "").trim();
    if (!ch) continue;
    const status = String(r[stI] || "").trim();
    if (status !== "발행완료") continue;
    // K-univ 계정 콘텐츠(인스타그램)은 K-ALBA KPI에서 제외
    if (ch.includes("인스타")) continue;
    posts.push({
      channel: ch,
      category: catI >= 0 ? String(r[catI] || "").trim() : "",
      date: dateI >= 0 ? String(r[dateI] || "").trim() : "",
    });
  }
  const groupBy = (key) =>
    posts.reduce((acc, p) => {
      const k = p[key] || "(미지정)";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
  return {
    published: posts.length,
    byChannel: groupBy("channel"),
    byCategory: groupBy("category"),
    recentDates: posts.map((p) => p.date).filter(Boolean).slice(-10),
  };
}

/* ---------- 채널 성과 수치 탭 분석 (수기 입력) ---------- */
/* 기대 형식: 날짜 | 채널 | 팔로워 | 조회수 | 좋아요 | 클릭 | 비고 */
function analyzeMetrics(rows) {
  const norm = (s) => String(s || "").trim();
  const hi = rows.findIndex(
    (r) => r.some((c) => norm(c) === "날짜") && r.some((c) => norm(c) === "채널")
  );
  if (hi < 0) return null;
  const header = rows[hi].map(norm);
  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const numericCols = ["팔로워", "조회수", "좋아요", "클릭"];
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const rec = {};
    header.forEach((h, i) => {
      if (h) rec[h] = norm(r[i]);
    });
    if (!rec["날짜"] && !rec["채널"]) continue;
    for (const k of numericCols) {
      if (k in rec) rec[k] = toNum(rec[k]);
    }
    out.push(rec);
  }
  return { columns: header.filter(Boolean), rows: out };
}

/* ---------- 메인 ---------- */
export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sheetId = process.env.SHEET_ID || DEFAULT_SHEET_ID;
  const contentGid = process.env.SHEET_GID_CONTENT || DEFAULT_CONTENT_GID;
  const metricsGid = process.env.SHEET_GID_METRICS || "";

  const result = { generatedAt: new Date().toISOString() };

  /* --- Supabase 지표 --- */
  if (supabaseUrl && serviceKey) {
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - WEEKS * 7);
    const sinceIso = since.toISOString();

    const count = async (table, filter) => {
      let q = sb.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count: c, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return c || 0;
    };
    const recentDates = async (table, filter) => {
      let q = sb
        .from(table)
        .select("created_at")
        .gte("created_at", sinceIso)
        .limit(20000);
      if (filter) q = filter(q);
      const { data, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return data || [];
    };

    try {
      const [
        workers,
        employers,
        deactivations,
        jobsTotal,
        jobsActive,
        jobsChatbot,
        jobsDirect,
        jobsWorknet,
        applications,
        favorites,
        contracts,
        partwork,
        recentWorkers,
        recentEmployers,
        recentJobs,
        recentApps,
      ] = await Promise.all([
        count("profiles", (q) => q.eq("user_type", "worker")),
        count("profiles", (q) => q.eq("user_type", "employer")),
        count("account_deactivations"),
        count("jobs"),
        count("jobs", (q) => q.eq("status", "active")),
        count("jobs", (q) => q.eq("source_type", "chatbot")),
        count("jobs", (q) => q.eq("source_type", "direct")),
        count("jobs", (q) => q.eq("source_type", "worknet")),
        count("applications"),
        count("job_favorites"),
        count("contracts"),
        count("partwork_applications"),
        recentDates("profiles", (q) => q.eq("user_type", "worker")),
        recentDates("profiles", (q) => q.eq("user_type", "employer")),
        recentDates("jobs"),
        recentDates("applications"),
      ]);

      result.users = {
        total: workers + employers,
        workers,
        employers,
        deactivations,
        weeklyWorkers: buildWeeklySeries(recentWorkers, WEEKS),
        weeklyEmployers: buildWeeklySeries(recentEmployers, WEEKS),
      };
      result.jobs = {
        total: jobsTotal,
        active: jobsActive,
        bySource: { worknet: jobsWorknet, direct: jobsDirect, chatbot: jobsChatbot },
        weeklyNew: buildWeeklySeries(recentJobs, WEEKS),
      };
      result.matching = {
        applications,
        favorites,
        contracts,
        partwork,
        weeklyApplications: buildWeeklySeries(recentApps, WEEKS),
      };
    } catch (e) {
      result.dbError = String((e && e.message) || e);
    }
  } else {
    result.dbError = "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.";
  }

  /* --- 구글시트: 콘텐츠 발행 --- */
  try {
    result.content = analyzeContent(await fetchSheetCsv(sheetId, contentGid));
    if (!result.content) result.contentError = "콘텐츠 시트에서 헤더(채널/발행 상태)를 찾지 못했습니다.";
  } catch (e) {
    result.contentError = String((e && e.message) || e);
  }

  /* --- 구글시트: 채널 성과 수치 (선택) --- */
  if (metricsGid) {
    try {
      result.metrics = analyzeMetrics(await fetchSheetCsv(sheetId, metricsGid));
      if (!result.metrics) result.metricsError = "성과 수치 탭에서 헤더(날짜/채널)를 찾지 못했습니다.";
    } catch (e) {
      result.metricsError = String((e && e.message) || e);
    }
  }

  return NextResponse.json(result);
}
