/**
 * GET /api/cron/sync-worknet
 *
 * Vercel Cron — 매 6시간마다 호출 (KST 03·09·15·21시)
 * 고용24 (WorkNet) Open API 에서 외국인 가능 공고를 수집해 jobs 테이블에 upsert.
 *
 * 인증
 *   - Vercel Cron 은 `Authorization: Bearer ${CRON_SECRET}` 헤더를 자동으로 붙임
 *   - 수동 호출 시 동일 헤더 필요
 *
 * 환경변수
 *   - WORKNET_API_KEY      공공데이터포털 인증키 (UUID)
 *   - CRON_SECRET          Vercel 자동 생성
 *   - SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - SLACK_WEBHOOK_URL    (선택) 실패 시 알림
 *
 * 동작
 *   1. sync_logs 에 'running' insert
 *   2. WorkNet API 페이지네이션 (최대 5페이지 × 100건)
 *   3. (source_type='worknet', source_id=wantedAuthNo) 기준 upsert
 *   4. sync_logs 를 'success' | 'failed' 로 마무리
 */
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WORKNET_API_BASE = "https://openapi.work.go.kr/opi/opi/opia/wantedApi.do";

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

  try {
    const apiKey = process.env.WORKNET_API_KEY;
    if (!apiKey) throw new Error("WORKNET_API_KEY 미설정");

    const pages = 5;
    const perPage = 100;

    for (let pageIndex = 1; pageIndex <= pages; pageIndex++) {
      const params = new URLSearchParams({
        authKey: apiKey,
        callTp: "L",
        returnType: "JSON",
        startPage: String(pageIndex),
        display: String(perPage),
        keyword: "외국인",
      });

      const response = await fetch(`${WORKNET_API_BASE}?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        console.error(`[worknet sync] page ${pageIndex} HTTP ${response.status}`);
        itemsFailed += perPage;
        continue;
      }

      // WorkNet 은 application/json 응답이지만 content-type 헤더가 종종 text/plain.
      // text() → JSON.parse 로 안전하게 처리.
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error(`[worknet sync] page ${pageIndex} 응답 파싱 실패`);
        itemsFailed += perPage;
        continue;
      }

      const wantedList = data?.wantedRoot?.wanted || [];

      for (const item of wantedList) {
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

      // 마지막 페이지면 조기 종료
      if (wantedList.length < perPage) break;
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
      })
      .eq("id", logEntry.id);

    return Response.json({
      ok: true,
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
          text: `🚨 WorkNet 동기화 실패: ${e?.message || e}`,
        }),
      }).catch(() => {});
    }

    return Response.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

/**
 * WorkNet API 응답 row → K-ALBA jobs 행 변환
 *
 * WorkNet 필드 참고
 *   wantedAuthNo  공고 고유번호 (대표 키)
 *   busplaName    사업장명
 *   title         공고 제목
 *   basicAddr     주소
 *   regionCd      "{시도코드}:{시군구코드}" 형식
 *   salTpNm       급여 형태명 (시급/일급/월급)
 *   sal           급여 금액 (문자열)
 *   workTimeTpNm  근무형태명 (전일제/시간제 등)
 *   empWantedNum  채용 인원
 *   empWantedEndDt 마감일 (YYYYMMDD or ISO)
 *   wantedInfoUrl 상세 페이지 (work.go.kr 상대경로)
 *   empWantedHomePg 외부 홈페이지 (있을 때)
 */
function transformWorknetItem(item) {
  const regionParts = String(item.regionCd || "").split(":");
  const expires = parseWorknetDate(item.empWantedEndDt);

  return {
    source_type: "worknet",
    source_id: item.wantedAuthNo,
    title: item.title || `${item.busplaName || "외국인 채용"} - ${item.jobsCd || "알바"}`,
    description: item.empWantedHomePg || "",
    employer_external_name: item.busplaName || null,
    address: item.basicAddr || "",
    sido: regionParts[0] || "",
    sigungu: regionParts[1] || "",
    pay_type: item.salTpNm || "월급",
    pay_amount: parseInt(item.sal, 10) || 0,
    work_type: item.workTimeTpNm || "전일제",
    work_hours: item.workTime || "",
    // WorkNet 응답에는 비자 명시가 없음 — 외국인 가능한 비자 보수적으로 모두 표기.
    // 실제 비자 적합성은 사용자가 공고 상세에서 재확인.
    visa_types: ["E-9", "F-2", "F-4", "F-5", "F-6", "H-2"],
    headcount: parseInt(item.empWantedNum, 10) || 1,
    apply_method: item.acptMthdCd || "online",
    apply_url:
      item.empWantedHomePg ||
      (item.wantedInfoUrl ? `https://www.work.go.kr${item.wantedInfoUrl}` : null),
    apply_email: item.acptMthdNm || null,
    expires_at: expires,
    status: "active",
    fetched_at: new Date().toISOString(),
  };
}

/**
 * WorkNet 마감일 → ISO timestamp
 * "20260601" / "2026-06-01" 둘 다 받음. 파싱 실패 시 null.
 */
function parseWorknetDate(value) {
  if (!value) return null;
  const s = String(value).trim();

  // YYYYMMDD
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (compact) {
    const [, y, m, d] = compact;
    return `${y}-${m}-${d}T23:59:59+09:00`;
  }

  // ISO or YYYY-MM-DD
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString();

  return null;
}
