/**
 * GET /api/cron/review-requests
 *
 * Vercel Cron — 매일 KST 10:00 호출 (vercel.json: "0 1 * * *")
 * 상호 평가 요청 알림톡 발송:
 *   1. [end]     계약 종료 다음날: 사장님→알바생 평가 + 알바생→근무처 평가 요청
 *   2. [midterm] 근무 2개월 시점(종료까지 2주 이상 남은 장기 계약): 중간 평가 요청
 *
 * 중복 방지: review_requests(contract_id, kind, target) UNIQUE — 발송 성공 시에만 기록
 * 이미 평가를 제출한 방향으로는 발송하지 않음
 *
 * 인증: Authorization: Bearer ${CRON_SECRET}
 * 알림톡 템플릿 (SENS 등록·검수 필요 — ALIMTALK_SETUP.md 참고):
 *   ALIMTALK_TPL_REVIEW_EMPLOYER  사장님 대상 (알바생 평가 요청)
 *   ALIMTALK_TPL_REVIEW_WORKER    알바생 대상 (근무처 평가 요청)
 */
import { createClient } from "@supabase/supabase-js";
import { sendAlimtalk, alimtalkConfigured } from "@/lib/alimtalk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!alimtalkConfigured()) {
    return Response.json({ ok: true, skipped: "alimtalk_not_configured" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const now = Date.now();
  const today = iso(now);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr";

  // ── 대상 계약 수집 ──
  // [end] 종료일이 어제~4일 전 (cron 실패 대비 3일 캐치업 창)
  const { data: ended } = await supabase
    .from("contracts")
    .select("id, worker_id, employer_id, worker_name, employer_name, company_name, worker_phone, employer_phone, contract_start, contract_end")
    .eq("worker_signed", true)
    .eq("employer_signed", true)
    .gte("contract_end", iso(now - 4 * DAY))
    .lt("contract_end", today);

  // [midterm] 시작 후 60~63일 경과 + (종료일 없음 또는 종료까지 14일 이상)
  const { data: mid } = await supabase
    .from("contracts")
    .select("id, worker_id, employer_id, worker_name, employer_name, company_name, worker_phone, employer_phone, contract_start, contract_end")
    .eq("worker_signed", true)
    .eq("employer_signed", true)
    .gte("contract_start", iso(now - 63 * DAY))
    .lte("contract_start", iso(now - 60 * DAY));

  const midFiltered = (mid || []).filter(
    (c) => !c.contract_end || new Date(c.contract_end).getTime() >= now + 14 * DAY
  );

  const batches = [
    ...(ended || []).map((c) => ({ c, kind: "end" })),
    ...midFiltered.map((c) => ({ c, kind: "midterm" })),
  ];
  if (!batches.length) return Response.json({ ok: true, sent: 0, checked: 0 });

  // 기존 발송 이력 + 제출된 평가 한 번에 조회
  const ids = batches.map((b) => b.c.id);
  const { data: sentLog } = await supabase.from("review_requests").select("contract_id, kind, target").in("contract_id", ids);
  const { data: doneReviews } = await supabase.from("reviews").select("contract_id, direction").in("contract_id", ids);
  const alreadySent = new Set((sentLog || []).map((r) => `${r.contract_id}:${r.kind}:${r.target}`));
  const alreadyReviewed = new Set((doneReviews || []).map((r) => `${r.contract_id}:${r.direction}`));

  let sent = 0;
  const errors = [];

  for (const { c, kind } of batches) {
    const url = `${site}/reviews/${c.id}`;
    const btn = [{ type: "WL", name: "평가 남기기", linkMobile: url, linkPc: url }];
    const periodNote = kind === "end" ? "함께한 근무는 어떠셨나요?" : "근무 2개월이 되었어요! 지금까지 어떠셨나요?";

    const targets = [
      {
        target: "employer",
        phone: c.employer_phone,
        tplEnv: "ALIMTALK_TPL_REVIEW_EMPLOYER",
        direction: "employer_to_worker",
        content: `[K-ALBA] ${c.worker_name || "알바생"}님 평가 요청\n\n${c.employer_name || "사장님"}님, ${periodNote}\n${c.worker_name || "알바생"}님에 대한 평가(별점+한줄평)를 남겨주시면, 성실한 알바생이 대학 졸업후 정식 취업을 하는데 큰 도움이 됩니다.\n\n소요시간 30초!`,
      },
      {
        target: "worker",
        phone: c.worker_phone,
        tplEnv: "ALIMTALK_TPL_REVIEW_WORKER",
        direction: "worker_to_employer",
        content: `[K-ALBA] ${c.company_name || "근무처"} 평가 요청\n\n${c.worker_name || "알바생"}님, ${periodNote}\n${c.company_name || "근무처"}에 대한 평가(별점+한줄평)를 남겨주시면, 좋은 일자리를 찾는 다른 알바생들에게 큰 도움이 됩니다.\n\n소요시간 30초!`,
      },
    ];

    for (const t of targets) {
      const sentKey = `${c.id}:${kind}:${t.target}`;
      const reviewKey = `${c.id}:${t.direction}`;
      if (alreadySent.has(sentKey) || alreadyReviewed.has(reviewKey)) continue;
      // end와 midterm 중복 방지: midterm을 이미 보냈고 end 차례면 보내되, 같은 kind 재발송만 차단
      const templateCode = process.env[t.tplEnv];
      if (!t.phone || !templateCode) continue;

      try {
        const r = await sendAlimtalk({ to: t.phone, templateCode, content: t.content, buttons: btn });
        if (r.ok) {
          sent++;
          await supabase.from("review_requests").insert({ contract_id: c.id, kind, target: t.target });
          alreadySent.add(sentKey);
        } else if (!r.skipped) {
          errors.push(`contract ${c.id} ${t.target}: ${r.status} ${JSON.stringify(r.data || {}).slice(0, 100)}`);
        }
      } catch (e) {
        errors.push(`contract ${c.id} ${t.target}: ${e.message}`);
      }
    }
  }

  return Response.json({ ok: true, checked: batches.length, sent, errors: errors.slice(0, 10) });
}
