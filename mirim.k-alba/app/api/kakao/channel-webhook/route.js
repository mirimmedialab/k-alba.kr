import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// 카카오톡 채널 웹훅 (채널 추가/차단 알림 수신)
// - 등록 위치: 카카오디벨로퍼스 [앱 > 웹훅 > 카카오톡 채널 웹훅] → https://www.k-alba.kr/api/kakao/channel-webhook
// - 검증: Authorization: KakaoAK ${대표 어드민 키} (env KAKAO_ADMIN_KEY)
// - 규격: 3초 내 2XX 응답 필수
export async function POST(request) {
  const adminKey = process.env.KAKAO_ADMIN_KEY;
  const auth = request.headers.get("authorization") || "";
  if (adminKey && auth !== `KakaoAK ${adminKey}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {}

  const event = body?.event;
  if (event !== "added" && event !== "blocked") {
    // 알 수 없는 이벤트도 카카오 규격상 2XX로 응답
    return Response.json({ ok: true, skipped: true });
  }

  const sb = supa();
  if (sb) {
    try {
      await sb.from("kakao_channel_events").upsert(
        {
          event,
          user_ref: body.id != null ? String(body.id) : null,
          id_type: body.id_type || null,
          channel_public_id: body.channel_public_id || null,
          resource_id: request.headers.get("x-kakao-resource-id") || null,
          occurred_at: body.updated_at || new Date().toISOString(),
        },
        { onConflict: "resource_id", ignoreDuplicates: true }
      );
    } catch (e) {
      console.error("[kakao-channel-webhook] insert failed:", e?.message || e);
      // 저장 실패해도 2XX (카카오 재전송 시 resource_id로 중복 방지)
    }
  }

  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({ ok: true, webhook: "kakao-channel" });
}
