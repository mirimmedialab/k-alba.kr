import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendAlimtalk, alimtalkConfigured } from "@/lib/alimtalk";

/**
 * POST /api/contract/notify
 *
 * 계약서 진행 상황을 상대방에게 자동 이메일 알림 (트랜잭셔널 — Resend)
 *
 * Body = { contract_id, event }
 *   event:
 *     - "sign_request"          사장님 작성 → 근로자에게 서명 요청
 *     - "approval_request"      알바생 작성 → 사장님에게 승인 요청
 *     - "approved"              사장님 승인 → 알바생에게 서명 안내
 *     - "employer_sign_request" 근로자 서명 완료 → 사장님에게 최종 서명 요청
 *     - "completed"             양측 서명 완료 → 양측에 완료 안내
 *
 * 인증: Bearer(계약 당사자) 또는 x-internal-auth(서버 내부 호출)
 */

const RESEND_API = "https://api.resend.com/emails";
const FROM = "K-ALBA <no-reply@k-alba.kr>";
const REPLY_TO = "k-alba@naver.com";
const FONT = "'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif";

function tpl({ title, lead, terms, url, cta }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3F0;padding:24px 0;font-family:${FONT};">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#0A1628;padding:20px 28px;">
    <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:1px;">K-ALBA</span>
    <span style="color:#B8944A;font-size:12px;margin-left:8px;">근로계약 알림</span>
  </td></tr>
  <tr><td style="height:3px;background:#B8944A;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px;">
    <div style="font-size:18px;font-weight:800;color:#0A1628;margin-bottom:10px;">${title}</div>
    <div style="font-size:14px;color:#333;line-height:1.8;margin-bottom:18px;">${lead}</div>
    <div style="background:#F5F3F0;border-radius:8px;padding:14px 16px;font-size:13px;color:#333;line-height:1.9;margin-bottom:22px;">${terms}</div>
    <a href="${url}" style="display:inline-block;background:#FF6B5A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:8px;">${cta}</a>
    <div style="font-size:11px;color:#999;margin-top:18px;line-height:1.7;">버튼이 눌리지 않으면 링크를 복사해 브라우저에 붙여넣어 주세요:<br/>${url}</div>
  </td></tr>
  <tr><td style="background:#0A1628;padding:16px 28px;font-size:11px;color:#8899AA;line-height:1.7;">
    K-ALBA · 미림미디어랩 주식회사<br/>본 메일은 근로계약 진행을 위한 서비스 알림입니다.
  </td></tr>
</table>
</td></tr></table>`;
}

async function sendMail(key, to, subject, html) {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`resend ${res.status}: ${t.slice(0, 200)}`);
  }
}

export async function POST(request) {
  try {
    const { contract_id, event } = await request.json();
    if (!contract_id || !event) {
      return NextResponse.json({ ok: false, error: "contract_id, event 필요" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 인증: 내부 호출 또는 계약 당사자
    const internal = request.headers.get("x-internal-auth") === (process.env.INTERNAL_API_KEY || "internal");
    let callerId = null;
    if (!internal) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ ok: false, error: "인증 필요" }, { status: 401 });
      }
      const { data: userData } = await supabase.auth.getUser(authHeader.substring(7));
      callerId = userData?.user?.id || null;
      if (!callerId) return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    const { data: c } = await supabase.from("contracts").select("*").eq("id", contract_id).single();
    if (!c) return NextResponse.json({ ok: false, error: "계약서 없음" }, { status: 404 });
    if (!internal && callerId !== c.worker_id && callerId !== c.employer_id) {
      return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
    }

    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "RESEND_API_KEY 미설정" }, { status: 500 });

    const ids = [c.worker_id, c.employer_id].filter(Boolean);
    const { data: profs } = await supabase.from("profiles").select("id, email, name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const workerEmail = profs?.find((p) => p.id === c.worker_id)?.email || null;
    const employerEmail = profs?.find((p) => p.id === c.employer_id)?.email || null;

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr";
    const url = `${site}/contracts/${c.id}`;
    const terms = [
      `🏪 ${c.company_name || "-"}`,
      `👤 ${c.worker_name || "-"}`,
      `💰 ${c.pay_type || "시급"} ${Number(c.pay_amount || 0).toLocaleString()}원`,
      `📅 ${(c.work_days || []).join("·")} ${c.work_start || ""}~${c.work_end || ""}`,
      `🗓 ${c.contract_start || "-"} ~ ${c.contract_end || "-"}`,
    ].join("<br/>");

    const jobs = [];
    const push = (to, subject, title, lead, cta) => {
      if (to) jobs.push({ to, subject, html: tpl({ title, lead, terms, url, cta }) });
    };

    switch (event) {
      case "sign_request":
        push(workerEmail, `[K-ALBA] ${c.company_name || "사업장"} 근로계약서 서명 요청`,
          "근로계약서가 도착했어요 ✍️",
          `${c.employer_name || "사장님"}님이 근로계약서를 보냈습니다.<br/>내용을 확인하고 전자서명해 주세요.`,
          "계약서 확인하고 서명하기");
        break;
      case "approval_request":
        push(employerEmail, `[K-ALBA] ${c.worker_name || "근로자"}님의 근로계약서 승인 요청`,
          "근로계약서 승인 요청이 도착했어요 📮",
          `${c.worker_name || "근로자"}님이 작성한 근로계약서가 승인을 기다리고 있습니다.<br/>조건을 확인하고 승인해 주세요.`,
          "계약서 확인하고 승인하기");
        break;
      case "approved":
        push(workerEmail, `[K-ALBA] 계약서가 승인되었어요 — 서명해 주세요`,
          "사장님이 계약서를 승인했어요 ✅",
          "이제 전자서명만 하면 계약이 진행됩니다.",
          "계약서 서명하기");
        break;
      case "employer_sign_request":
        push(employerEmail, `[K-ALBA] ${c.worker_name || "근로자"}님이 서명했어요 — 최종 서명 요청`,
          "근로자 서명 완료 ✍️",
          `${c.worker_name || "근로자"}님이 서명을 완료했습니다.<br/>사장님의 최종 서명만 남았어요.`,
          "최종 서명하기");
        break;
      case "completed":
        push(workerEmail, `[K-ALBA] 근로계약이 완료되었습니다 🎉`,
          "근로계약 완료 🎉",
          "양측 서명이 모두 끝났습니다.<br/>계약서 PDF를 다운로드해 보관하세요.",
          "계약서 PDF 다운로드");
        push(employerEmail, `[K-ALBA] 근로계약이 완료되었습니다 🎉`,
          "근로계약 완료 🎉",
          "양측 서명이 모두 끝났습니다.<br/>계약서 PDF를 다운로드해 보관하세요.",
          "계약서 PDF 다운로드");
        break;
      default:
        return NextResponse.json({ ok: false, error: "알 수 없는 event" }, { status: 400 });
    }

    let sent = 0;
    const errors = [];
    for (const j of jobs) {
      try {
        await sendMail(key, j.to, j.subject, j.html);
        sent++;
      } catch (e) {
        errors.push(e.message);
      }
    }

    // ─── 카카오 알림톡 (SENS 설정 + 템플릿 심사 완료 시에만 발송) ───
    let alimSent = 0;
    if (alimtalkConfigured()) {
      const workerPhone = c.worker_phone || null;
      const employerPhone = c.employer_phone || null;
      const btn = [{ type: "WL", name: "계약서 확인", linkMobile: url, linkPc: url }];
      const alimJobs = [];
      const pushAlim = (to, tplEnv, content) => {
        const templateCode = process.env[tplEnv];
        if (to && templateCode) alimJobs.push({ to, templateCode, content, buttons: btn });
      };
      const summary = `· 근무: ${(c.work_days || []).join("·")} ${c.work_start || ""}~${c.work_end || ""}\n· 급여: ${c.pay_type || "시급"} ${Number(c.pay_amount || 0).toLocaleString()}원`;

      switch (event) {
        case "sign_request":
          pushAlim(workerPhone, "ALIMTALK_TPL_SIGN_REQUEST",
            `[K-ALBA] 근로계약서 서명 요청\n\n${c.worker_name || "근로자"}님, ${c.company_name || "사업장"}에서 근로계약서를 보냈습니다.\n\n${summary}\n\n내용을 확인하고 전자서명해 주세요.`);
          break;
        case "approval_request":
          pushAlim(employerPhone, "ALIMTALK_TPL_APPROVAL_REQUEST",
            `[K-ALBA] 근로계약서 승인 요청\n\n${c.worker_name || "근로자"}님이 작성한 근로계약서가 승인을 기다리고 있습니다.\n\n${summary}\n\n조건을 확인하고 승인해 주세요.`);
          break;
        case "approved":
          pushAlim(workerPhone, "ALIMTALK_TPL_APPROVED",
            `[K-ALBA] 계약서 승인 완료\n\n${c.worker_name || "근로자"}님, 사장님이 계약서를 승인했습니다.\n전자서명을 진행해 주세요.`);
          break;
        case "employer_sign_request":
          pushAlim(employerPhone, "ALIMTALK_TPL_EMPLOYER_SIGN",
            `[K-ALBA] 최종 서명 요청\n\n${c.worker_name || "근로자"}님이 서명을 완료했습니다.\n사장님의 최종 서명만 남았습니다.`);
          break;
        case "completed": {
          const done = `[K-ALBA] 근로계약 완료\n\n양측 서명이 모두 완료되었습니다.\n계약서 PDF를 다운로드해 보관하세요.`;
          pushAlim(workerPhone, "ALIMTALK_TPL_COMPLETED", done);
          pushAlim(employerPhone, "ALIMTALK_TPL_COMPLETED", done);
          break;
        }
      }

      for (const j of alimJobs) {
        try {
          const r = await sendAlimtalk(j);
          if (r.ok) alimSent++;
          else if (!r.skipped) errors.push(`alimtalk ${r.status}: ${JSON.stringify(r.data || {}).slice(0, 120)}`);
        } catch (e) {
          errors.push(`alimtalk: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ ok: true, sent, alimtalk_sent: alimSent, skipped: jobs.length === 0, errors });
  } catch (error) {
    console.error("[contract/notify] error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
