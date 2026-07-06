import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const WEEKS = 12;
const DEFAULT_SHEET_ID = "1cgYYoJk5O7mJsmA-maZAMbNE8z6PV750-22hjDZvpYw";
const DEFAULT_CONTENT_GID = "1923809566"; // [K-ABLA]Content 탭
const DEFAULT_METRICS_GID = "1912359929"; // [K-ALBA]성과 탭

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
  const subjI = idx("주제");
  const titleI = idx("제목");
  const linkI = idx("게시물링크");
  const numI = idx("번호");
  // 발행완료된 콘텐츠만 집계 (아이디어/계획/미발행 백로그는 KPI에서 제외)
  const posts = [];
  for (const r of rows.slice(hi + 1)) {
    const ch = String(r[chI] || "").trim();
    if (!ch) continue;
    const status = String(r[stI] || "").trim();
    if (status !== "발행완료") continue;
    const linkCell = linkI >= 0 ? String(r[linkI] || "") : "";
    const urlMatch = linkCell.match(/https?:\/\/[^\s"',]+/);
    posts.push({
      num: numI >= 0 ? String(r[numI] || "").trim() : "",
      channel: ch,
      category: catI >= 0 ? String(r[catI] || "").trim() : "",
      date: dateI >= 0 ? String(r[dateI] || "").trim() : "",
      subject: subjI >= 0 ? String(r[subjI] || "").trim() : "",
      title: titleI >= 0 ? String(r[titleI] || "").trim() : "",
      url: urlMatch ? urlMatch[0] : "",
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
    posts,
  };
}

/* ---------- 한국식 날짜 파싱: "2026. 7. 2(목)" ---------- */
function parseKDate(s) {
  const m = String(s || "").match(/(\d{4})\s*[.\-\/]\s*(\d{1,2})\s*[.\-\/]\s*(\d{1,2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
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
  const numericRe = /(조회|좋아요|댓글|공유|클릭|팔로워)/;
  const out = [];
  for (const r of rows.slice(hi + 1)) {
    const rec = {};
    header.forEach((h, i) => {
      if (h) rec[h] = norm(r[i]);
    });
    if (!rec["날짜"] && !rec["채널"]) continue;
    for (const k of Object.keys(rec)) {
      if (numericRe.test(k)) rec[k] = toNum(rec[k]);
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
  const metricsGid = process.env.SHEET_GID_METRICS || DEFAULT_METRICS_GID;

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

  /* --- 마케팅 병합 요약 (성과 탭 + Content 탭 링크, 번호 매칭) --- */
  if (result.metrics && result.metrics.rows) {
    const posts = (result.content && result.content.posts) || [];
    const byNum = {};
    for (const p of posts) if (p.num) byNum[p.num] = p;
    const items = result.metrics.rows
      .map((r) => {
        const num = String(r["번호"] || "").trim();
        const p = byNum[num] || null;
        const d1 = r["조회 수(D+1)"];
        const d3 = r["조회 수(D+3)"];
        const d7 = r["조회 수(D+7)"];
        const latest = [d7, d3, d1].find((v) => typeof v === "number");
        const dateObj = parseKDate(r["날짜"]);
        return {
          num,
          date: String(r["날짜"] || ""),
          channel: String(r["채널"] || ""),
          title: String(r["제목"] || "") || (p ? p.subject : ""),
          viewsD1: typeof d1 === "number" ? d1 : null,
          viewsD3: typeof d3 === "number" ? d3 : null,
          viewsD7: typeof d7 === "number" ? d7 : null,
          views: typeof latest === "number" ? latest : null,
          likes: typeof r["좋아요 수(D+7)"] === "number" ? r["좋아요 수(D+7)"] : null,
          comments: typeof r["댓글 수(D+7)"] === "number" ? r["댓글 수(D+7)"] : null,
          shares: typeof r["공유 수(D+7)"] === "number" ? r["공유 수(D+7)"] : null,
          url: p ? p.url : "",
          ts: dateObj ? dateObj.getTime() : 0,
        };
      });
    items.sort((a, b) => b.ts - a.ts);
    const sum = (k) => items.reduce((a, it) => a + (typeof it[k] === "number" ? it[k] : 0), 0);
    const weeklyPublished = buildWeeklySeries(
      items.filter((it) => it.ts).map((it) => ({ created_at: new Date(it.ts).toISOString() })),
      WEEKS
    );
    const weeklyViews = (() => {
      const map = {};
      for (const it of items) {
        if (!it.ts || typeof it.views !== "number") continue;
        const k = weekKey(new Date(it.ts));
        map[k] = (map[k] || 0) + it.views;
      }
      const out = [];
      const now = weekStart(new Date());
      for (let i = WEEKS - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() - i * 7);
        const k = d.toISOString().slice(0, 10);
        out.push({ week: k, count: map[k] || 0 });
      }
      return out;
    })();
    const best = items
      .filter((it) => typeof it.views === "number")
      .slice()
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    result.marketing = {
      totalViews: sum("views"),
      totalLikes: sum("likes"),
      totalComments: sum("comments"),
      totalShares: sum("shares"),
      weeklyPublished,
      weeklyViews,
      best,
      items,
    };
  }

  return NextResponse.json(result);
}
