/**
 * GET /api/cron/sync-worknet
 *
 * Vercel Cron — 매 6시간마다 호출 (KST 03·09·15·21시)
 * 고용24 (work24.go.kr) Open API 에서 외국인 관련 공고를 수집해 jobs 테이블에 upsert.
 *
 * ⚠️ 2026-06 수정: 구 워크넷(openapi.work.go.kr/.../wantedApi.do)이 폐기되어
 *    고용24 신 엔드포인트(callOpenApiSvcInfo210L01.do)로 교체.
 *    - returnType 은 XML 만 지원 (JSON 불가) → 정규식으로 파싱.
 *    - 응답 필드명 변경: company/minSal/region/closeDt/wantedInfoUrl 등.
 *    - 외국인 관련 공고를 키워드 3종(외국인·비자·국적)으로 수집 후
 *      wantedAuthNo(구인인증번호) 기준 중복 제거.
 *
 * 인증
 *   - Vercel Cron 은 `Authorization: Bearer ${CRON_SECRET}` 헤더를 자동으로 붙임
 *   - 수동 호출 시 동일 헤더 필요
 *
 * 환경변수
 *   - WORKNET_API_KEY      고용24 OpenAPI 인증키 (UUID)
 *   - CRON_SECRET          Vercel 자동 생성
 *   - SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SLACK_WEBHOOK_URL    (선택) 실패 시 알림
 *
 * 동작
 *   1. sync_logs 에 'running' insert
 *   2. 키워드 3종 × 페이지네이션(최대 10페이지 × 100건)으로 수집
 *   3. wantedAuthNo 기준 중복 제거
 *   4. (source_type='worknet', source_id=wantedAuthNo) 기준 upsert
 *   5. sync_logs 를 'success' | 'failed' 로 마무리
 */
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 고용24 채용정보 목록 API (구 워크넷 wantedApi.do 후속)
const WORK24_API_BASE =
  "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";

// 외국인 관련 공고 수집 키워드 (중복은 wantedAuthNo 로 제거)
const KEYWORDS = ["외국인", "비자", "국적"];
const PER_PAGE = 100;
const MAX_PAGES = 10; // 키워드당 최대 1,000건

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const startedAt = new Date();
  const { data: logEntry } = await supabase
    .from("sync_logs")
    .insert({
      source: "worknet",
      status: "running",
      started_at: startedAt.toISOString(),
    })
    .select()
    .single();

  let itemsFetched = 0;
  let itemsNew = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  let apiCalls = 0;

  try {
    const apiKey = process.env.WORKNET_API_KEY;
    if (!apiKey) throw new Error("WORKNET_API_KEY 미설정");

    // 1) 키워드별 수집 → wantedAuthNo 기준 중복 제거
    const uniqueItems = new Map(); // wantedAuthNo -> item 객체

    for (const keyword of KEYWORDS) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const params = new URLSearchParams({
          authKey: apiKey,
          callTp: "L",
          returnType: "XML",
          startPage: String(page),
          display: String(PER_PAGE),
          keyword,
        });

        const response = await fetch(
          `${WORK24_API_BASE}?${params.toString()}`,
          { cache: "no-store" }
        );
        apiCalls++;

        if (!response.ok) {
          console.error(
            `[worknet sync] "${keyword}" page ${page} HTTP ${response.status}`
          );
          break; // 이 키워드 중단, 다음 키워드로
        }

        const xml = await response.text();
        const blocks = parseWantedBlocks(xml);
        if (blocks.length === 0) break;

        for (const item of blocks) {
          if (item.wantedAuthNo && !uniqueItems.has(item.wantedAuthNo)) {
            uniqueItems.set(item.wantedAuthNo, item);
          }
        }

        // 마지막 페이지면 조기 종료
        if (blocks.length < PER_PAGE) break;
      }
    }

    // 2) jobs 테이블에 upsert
    for (const item of uniqueItems.values()) {
      itemsFetched++;
      try {
        const job = transformWorknetItem(item);
        if (!job.source_id) {
          itemsFailed++;
          continue;
        }

        const { data: existing } = await supabase
          .from("jobs")
          .select("id")
          .eq("source_type", "worknet")
          .eq("source_id", job.source_id)
          .maybeSingle();

        if (existing) {
          const { error: updErr } = await supabase
            .from("jobs")
            .update(job)
            .eq("id", existing.id);
          if (updErr) throw updErr;
          itemsUpdated++;
        } else {
          const { error: insErr } = await supabase.from("jobs").insert(job);
          if (insErr) throw insErr;
          itemsNew++;
        }
      } catch (err) {
        console.error(`[worknet sync] item error:`, err?.message);
        itemsFailed++;
      }
    }

    await supabase
      .from("sync_logs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        items_fetched: itemsFetched,
        items_new: itemsNew,
        items_updated: itemsUpdated,
        items_failed: itemsFailed,
        metadata: { keywords: KEYWORDS, api_calls: apiCalls, unique: itemsFetched },
      })
      .eq("id", logEntry.id);

    return Response.json({
      ok: true,
      keywords: KEYWORDS,
      apiCalls,
      itemsFetched,
      itemsNew,
      itemsUpdated,
      itemsFailed,
    });
  } catch (e) {
    console.error("[worknet sync] fatal:", e);

    await supabase
      .from("sync_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        items_fetched: itemsFetched,
        items_failed: itemsFailed,
        error: e?.message?.slice(0, 500) || String(e),
      })
      .eq("id", logEntry.id);

    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 WorkNet(고용24) 동기화 실패: ${e?.message || e}`,
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

/**
 * 고용24 XML 응답 → <wanted> 블록 배열(필드 객체)로 파싱.
 * 응답 구조가 평면(중첩 없음)이라 정규식으로 안전하게 처리.
 */
function parseWantedBlocks(xml) {
  const out = [];
  const blockRe = /<wanted>([\s\S]*?)<\/wanted>/g;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const body = m[1];
    const obj = {};
    const fieldRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let f;
    while ((f = fieldRe.exec(body)) !== null) {
      obj[f[1]] = unescapeXml(f[2].trim());
    }
    out.push(obj);
  }
  return out;
}

function unescapeXml(s) {
  return String(s)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * 고용24 채용정보 row → K-ALBA jobs 행 변환
 *
 * 고용24 필드 (callOpenApiSvcInfo210L01.do, callTp=L)
 *   wantedAuthNo  구인인증번호 (대표 키)
 *   company       회사명
 *   busino        사업자등록번호
 *   indTpNm       업종명
 *   title         채용 제목
 *   salTpNm       임금형태 (시급/일급/월급/연봉)
 *   sal           급여 표시문자열 (예: "10320원 ~ 10320원")
 *   minSal/maxSal 최소/최대 임금액 (숫자 문자열)
 *   region        근무지역명 (예: "경기도 화성시 만세구")
 *   holidayTpNm   근무형태 (예: "주5일근무")
 *   empTpCd       고용형태코드 (10/20 정규, 11/21 시간(선택)제)
 *   closeDt       마감일자 (YY-MM-DD)
 *   basicAddr     근무지 기본주소
 *   detailAddr    근무지 상세주소
 *   wantedInfoUrl 채용정보 상세 URL (절대주소)
 *   jobsCd        직종코드
 */
function transformWorknetItem(item) {
  const regionParts = String(item.region || "").trim().split(/\s+/);
  const isPartTime = item.empTpCd === "11" || item.empTpCd === "21";

  // 카드에 보여줄 요약 설명 (업종·근무형태·학력·경력)
  const description = [
    item.indTpNm,
    item.holidayTpNm,
    item.minEdubg && `학력 ${item.minEdubg}`,
    item.career && `경력 ${item.career}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    source_type: "worknet",
    source_id: item.wantedAuthNo,
    title:
      item.title || `${item.company || "외국인 채용"} - ${item.jobsCd || "채용"}`,
    // job_type 은 NOT NULL — 업종명을 카테고리로 사용 (없으면 '기타')
    job_type: item.indTpNm || "기타",
    description,
    employer_external_name: item.company || null,
    address: item.basicAddr || "",
    address_detail: item.detailAddr || "",
    sido: regionParts[0] || "",
    sigungu: regionParts.slice(1).join(" ") || "",
    pay_type: item.salTpNm || "월급",
    pay_amount: parseInt(item.minSal, 10) || 0,
    work_type: isPartTime ? "시간제" : "전일제",
    work_hours: item.holidayTpNm || "",
    // 고용24 응답에는 비자 명시가 없음 — 외국인 가능한 비자 보수적으로 모두 표기.
    // 실제 비자 적합성은 사용자가 공고 상세에서 재확인.
    visa_types: ["E-9", "F-2", "F-4", "F-5", "F-6", "H-2"],
    headcount: "1", // 목록 API 응답에 모집인원 필드 없음 → 기본 1 (컬럼 타입 text)
    apply_url: item.wantedInfoUrl || null,
    expires_at: parseWorknetDate(item.closeDt),
    status: "active",
    fetched_at: new Date().toISOString(),
    // 고용24 원본 응답 26필드를 통째로 보관 (현재 매핑 안 한 busino/career/jobsCd/maxSal 등 포함).
    // 나중에 필요한 필드를 꺼내 쓰거나 CSV/Excel 로 내보낼 수 있음.
    raw: item,
  };
}

/**
 * 고용24 마감일 → ISO timestamp
 * 값 안에서 날짜 패턴을 추출한다. 고용24는 "채용시까지" 등 텍스트가
 * 날짜 앞에 붙어 오는 경우가 많아(예: "채용시까지  26-08-08") 전체 매칭이 아닌
 * 부분 검색으로 처리한다.
 *   지원 포맷: "2026-07-09" / "20260709" / "26-07-09" (앞뒤 텍스트 허용). 실패 시 null.
 */
function parseWorknetDate(value) {
  if (!value) return null;
  const s = String(value).trim();

  // YYYY-MM-DD (문자열 내 어디든)
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T23:59:59+09:00`;

  // YYYYMMDD
  m = /(\d{4})(\d{2})(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}T23:59:59+09:00`;

  // YY-MM-DD (예: "채용시까지  26-08-08")
  m = /(\d{2})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `20${m[1]}-${m[2]}-${m[3]}T23:59:59+09:00`;

  return null;
}
