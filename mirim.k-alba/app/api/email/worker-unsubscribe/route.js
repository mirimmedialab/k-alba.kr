import { createClient } from "@supabase/supabase-js";
import { verifyUnsubToken } from "@/lib/newJobEmail";

/**
 * 알바생 마케팅 수신거부
 *
 * GET /api/email/worker-unsubscribe?token=<profileId.hmac>
 *
 * 수신거부 = 마케팅 동의 철회 → profiles.agreed_marketing_at 을 NULL 로.
 * 이후 발송 대상 쿼리(agreed_marketing_at IS NOT NULL)에서 자연히 제외된다.
 * 토큰은 HMAC 서명이라 별도 DB 컬럼 없이 검증 가능(EMAIL_UNSUB_SECRET 또는 SERVICE_ROLE_KEY).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title, msg) {
  return new Response(
    `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;background:#F4F1EA;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;">
<div style="max-width:420px;margin:0 auto;padding:64px 24px;text-align:center;">
  <div style="font-size:22px;font-weight:800;color:#3F5273;margin-bottom:24px;">K-ALBA</div>
  <div style="background:#fff;border:1px solid #D9D4C7;border-radius:16px;padding:32px 24px;">
    <div style="font-size:17px;font-weight:700;color:#3F5273;margin-bottom:12px;">${title}</div>
    <div style="font-size:14px;color:#555;line-height:1.7;">${msg}</div>
    <a href="https://k-alba.kr" style="display:inline-block;margin-top:24px;color:#C2512A;font-weight:600;text-decoration:none;font-size:14px;">K-ALBA 홈으로 →</a>
  </div>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const secret =
      process.env.EMAIL_UNSUB_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const profileId = verifyUnsubToken(token, secret);
    if (!profileId) {
      return page("링크가 올바르지 않아요", "수신거부 링크가 만료되었거나 잘못되었습니다. 문의: k-alba@naver.com");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from("profiles")
      .update({ agreed_marketing_at: null })
      .eq("id", profileId);

    if (error) {
      return page("처리 중 문제가 생겼어요", "잠시 후 다시 시도해 주세요. 문제가 계속되면 k-alba@naver.com 으로 문의해 주세요.");
    }

    return page(
      "수신거부가 완료되었어요",
      "앞으로 K-ALBA 신규 공고 안내 메일을 보내드리지 않아요.<br>언제든 마이페이지에서 다시 받아보실 수 있어요."
    );
  } catch (e) {
    console.error("[worker-unsubscribe] error:", e);
    return page("처리 중 문제가 생겼어요", "잠시 후 다시 시도해 주세요.");
  }
}
