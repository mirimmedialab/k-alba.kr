import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 이메일 수신거부 API
 *
 * GET /api/email/unsubscribe?token={tracking_token}&reason=...
 *
 * 이메일 하단의 "수신 거부" 링크가 이 엔드포인트를 호출.
 * 24시간 내 처리 의무 준수 (정보통신망법).
 *
 * 동작:
 *   1. tracking_token으로 email_sends 레코드 찾기
 *   2. email_unsubscribes 테이블에 기록 (트리거가 자동으로 email_contacts 상태 변경)
 *   3. 사용자에게 확인 페이지 응답
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const reason = searchParams.get("reason") || null;

    if (!token) {
      return new NextResponse(buildHtml({
        title: "오류",
        body: "유효하지 않은 요청입니다.",
        success: false,
      }), {
        status: 400,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. 토큰으로 email_sends 찾기
    const { data: send } = await supabase
      .from("email_sends")
      .select("id, email, tracking_token")
      .eq("tracking_token", token)
      .single();

    if (!send) {
      return new NextResponse(buildHtml({
        title: "링크 만료",
        body: "이 링크는 이미 처리되었거나 유효하지 않습니다.",
        success: false,
      }), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 2. 이미 수신거부한 경우
    const { data: existing } = await supabase
      .from("email_unsubscribes")
      .select("id")
      .eq("email", send.email)
      .maybeSingle();

    if (existing) {
      return new NextResponse(buildHtml({
        title: "이미 처리됨",
        email: send.email,
        body: "이미 수신 거부 처리되었습니다.",
        success: true,
      }), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // 3. IP / User-Agent 기록
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
    const userAgent = request.headers.get("user-agent") || null;

    // 4. 수신거부 등록 (트리거가 자동으로 email_contacts 상태 변경)
    await supabase.from("email_unsubscribes").insert({
      email: send.email,
      tracking_token: token,
      reason,
      ip_address: ip,
      user_agent: userAgent,
    });

    return new NextResponse(buildHtml({
      title: "수신 거부 완료",
      email: send.email,
      body: "앞으로 K-ALBA 안내 이메일을 받지 않으시게 됩니다.",
      success: true,
    }), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("[email/unsubscribe] error:", error);
    return new NextResponse(buildHtml({
      title: "오류",
      body: "처리 중 오류가 발생했습니다. hello@k-alba.kr 로 문의해 주세요.",
      success: false,
    }), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function buildHtml({ title, body, email, success }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} · K-ALBA</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<style>
body{font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;margin:0;padding:0;background:#F7F5F0;color:#0A1628;line-height:1.6;letter-spacing:-.01em}
.wrap{max-width:480px;margin:80px auto;padding:40px 30px;background:#FFF;border:1px solid #D9D4C7;border-radius:4px}
.line{width:40px;height:3px;background:#B8944A;margin-bottom:18px}
.tag{font-size:11px;font-weight:700;color:#6B7A95;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
h1{font-size:22px;font-weight:800;letter-spacing:-.025em;margin-bottom:14px;line-height:1.3}
p{font-size:14px;color:#3F5273;margin-bottom:8px}
.email{color:#0A1628;font-weight:600;margin-bottom:20px}
.ok{color:#2A7A4A}
.fail{color:#C2512A}
.back{margin-top:28px;display:inline-block;padding:10px 18px;background:#0A1628;color:#B8944A;text-decoration:none;font-weight:700;font-size:13px;border-radius:4px;letter-spacing:-.01em}
</style>
</head>
<body>
<div class="wrap">
  <div class="line"></div>
  <div class="tag">Unsubscribe · 수신 거부</div>
  <h1 class="${success ? 'ok' : 'fail'}">${success ? '✓' : '!'} ${title}</h1>
  ${email ? `<p class="email">${email}</p>` : ''}
  <p>${body}</p>
  <a href="https://k-alba.kr" class="back">K-ALBA 홈으로 →</a>
</div>
</body>
</html>`;
}
