import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * 이메일 개봉 추적 API
 *
 * GET /api/email/track-open?token={tracking_token}
 *
 * 이메일 본문에 삽입된 1x1 투명 픽셀이 이 엔드포인트를 호출.
 * 응답은 항상 1x1 투명 GIF.
 */

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64"
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return pixelResponse();
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 이미 개봉된 이메일은 재기록 안 함
    const { data: send } = await supabase
      .from("email_sends")
      .select("id, opened_at, campaign_id")
      .eq("tracking_token", token)
      .single();

    if (send && !send.opened_at) {
      // 개봉 기록
      await supabase
        .from("email_sends")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", send.id);

      // 캠페인 카운터 증가 (read-modify-write)
      const { data: campaign } = await supabase
        .from("email_campaigns")
        .select("opened_count")
        .eq("id", send.campaign_id)
        .single();

      if (campaign) {
        await supabase
          .from("email_campaigns")
          .update({ opened_count: (campaign.opened_count || 0) + 1 })
          .eq("id", send.campaign_id);
      }
    }

    return pixelResponse();
  } catch {
    return pixelResponse();
  }
}

function pixelResponse() {
  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
