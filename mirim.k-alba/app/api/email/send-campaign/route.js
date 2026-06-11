import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 이메일 캠페인 발송 API
 *
 * POST /api/email/send-campaign
 * Body = { campaign_id: "uuid", test_mode? }
 *
 * test_mode=true: 실제 발송 없이 대상자 수만 카운트
 *
 * 발송 방식:
 *   - Resend (https://resend.com) 권장 — 월 3000건 무료, 한국 IP 지원
 *   - 대안: SendGrid, AWS SES, Mailgun
 *
 * 환경변수:
 *   RESEND_API_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SITE_URL (unsubscribe 링크 생성용, 예: https://k-alba.kr)
 *
 * 🚨 법적 준수 사항 (이 API가 자동 처리):
 *   - 제목에 "(광고)" 접두어 자동 추가
 *   - 본문 하단에 수신거부 링크 자동 삽입
 *   - 발송자 정보(회사명, 주소, 연락처) 자동 삽입
 *   - opted_out/bounced/complained 상태 자동 제외
 *   - 발송 시간 23시~08시 자동 차단 (야간 발송 금지)
 */

const RESEND_API = "https://api.resend.com/emails";

// ────────── 야간 발송 차단 ──────────
function isBusinessHours() {
  const hour = new Date().getHours();
  return hour >= 8 && hour < 23;
}

// ────────── 본문 템플릿 처리 ──────────
function buildEmailHtml(
  campaign,
  contact,
  trackingToken,
  siteUrl
) {
  // 변수 치환
  let html = campaign.body_html
    .replace(/\{\{company_name\}\}/g, contact.company_name || "사장님")
    .replace(/\{\{contact_name\}\}/g, contact.contact_name || "")
    .replace(/\{\{email\}\}/g, contact.email);

  const unsubUrl = `${siteUrl}/api/email/unsubscribe?token=${trackingToken}`;
  const openPixelUrl = `${siteUrl}/api/email/track-open?token=${trackingToken}`;

  // 법적 필수 하단 정보 추가
  const footer = `
    <div style="margin-top:40px;padding:20px;border-top:1px solid #D9D4C7;font-size:11px;color:#6B7A95;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;line-height:1.6;">
      <div style="margin-bottom:8px;">
        <strong style="color:#3F5273;">발송자 정보</strong><br>
        미림미디어랩 주식회사 · 대표 남기환<br>
        서울특별시 (사업장 주소)<br>
        hello@k-alba.kr · https://k-alba.kr
      </div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px dashed #D9D4C7;">
        본 이메일은 귀사 공고에 공개된 이메일 주소로 발송되었습니다.
        K-ALBA 서비스 안내가 불필요하시면 아래 링크로 거부하실 수 있습니다.<br>
        <a href="${unsubUrl}" style="color:#C2512A;font-weight:600;">📧 수신 거부하기</a>
      </div>
    </div>
    <img src="${openPixelUrl}" width="1" height="1" style="display:block;" alt="" />
  `;

  // HTML 끝에 추가 (</body> 앞에 붙임)
  if (html.includes("</body>")) {
    html = html.replace("</body>", footer + "</body>");
  } else {
    html = html + footer;
  }

  return html;
}

// ────────── Resend 발송 ──────────
async function sendViaResend(payload) {
  const { from, to, subject, html } = payload;
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${errText}` };
    }

    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ────────── 메인 핸들러 ──────────
export async function POST(request) {
  try {
    const { campaign_id, test_mode = false } = await request.json();
    if (!campaign_id) {
      return NextResponse.json({ ok: false, error: "campaign_id 필요" }, { status: 400 });
    }

    // 야간 발송 차단
    if (!test_mode && !isBusinessHours()) {
      return NextResponse.json({
        ok: false,
        error: "이메일은 08:00~23:00 사이에만 발송할 수 있습니다.",
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. 캠페인 정보 조회
    const { data: campaign, error: cErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (cErr || !campaign) {
      return NextResponse.json({ ok: false, error: "캠페인을 찾을 수 없음" }, { status: 404 });
    }

    if (campaign.status === "sent") {
      return NextResponse.json({ ok: false, error: "이미 발송된 캠페인입니다." }, { status: 400 });
    }

    // 2. 대상자 조회
    const { data: targets, error: tErr } = await supabase.rpc("campaign_targets", { campaign_id });
    if (tErr) {
      return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ ok: true, message: "대상자가 없습니다.", count: 0 });
    }

    // 테스트 모드: 카운트만 반환
    if (test_mode) {
      return NextResponse.json({
        ok: true,
        test_mode: true,
        target_count: targets.length,
        message: `${targets.length}명에게 발송 예정 (test_mode)`,
      });
    }

    // 3. 캠페인 상태 업데이트
    await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_targets: targets.length,
      })
      .eq("id", campaign_id);

    // 4. 제목에 "(광고)" 접두어 추가 (중복 방지)
    const subject = campaign.subject.startsWith("(광고)")
      ? campaign.subject
      : `(광고) ${campaign.subject}`;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr";
    const fromField = `${campaign.from_name} <${campaign.from_email}>`;

    // 5. 개별 발송 (rate limit: 초당 10건)
    let sentCount = 0;
    let failedCount = 0;

    for (const target of targets) {
      // 5-1. email_sends 로그 생성
      const { data: sendRecord } = await supabase
        .from("email_sends")
        .insert({
          campaign_id,
          contact_id: target.contact_id,
          email: target.email,
          status: "pending",
        })
        .select()
        .single();

      if (!sendRecord) {
        failedCount++;
        continue;
      }

      // 5-2. 본문 렌더링 (변수 치환 + 수신거부 링크)
      const html = buildEmailHtml(campaign, target, sendRecord.tracking_token, siteUrl);

      // 5-3. 발송
      const result = await sendViaResend({
        from: fromField,
        to: target.email,
        subject,
        html,
      });

      if (result.ok) {
        await supabase
          .from("email_sends")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", sendRecord.id);
        sentCount++;
      } else {
        await supabase
          .from("email_sends")
          .update({
            status: "failed",
            error_message: result.error,
          })
          .eq("id", sendRecord.id);
        failedCount++;
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 100));
    }

    // 6. 캠페인 완료 처리
    await supabase
      .from("email_campaigns")
      .update({
        status: "sent",
        completed_at: new Date().toISOString(),
        sent_count: sentCount,
      })
      .eq("id", campaign_id);

    return NextResponse.json({
      ok: true,
      campaign_id,
      target_count: targets.length,
      sent_count: sentCount,
      failed_count: failedCount,
    });
  } catch (error) {
    console.error("[email/send-campaign] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "발송 중 오류 발생" },
      { status: 500 }
    );
  }
}
