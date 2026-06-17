import { handlePostJob } from "@/lib/kakaoPostJob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글로벌 폴백 블록용: 진행 중 드래프트가 있으면 답으로 기록, 없으면 페르소나 안내(시작 안 함)
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch (_) {}
  return handlePostJob(body, { allowStart: false });
}

export async function GET() {
  return Response.json({ ok: true, skill: "fallback" });
}
