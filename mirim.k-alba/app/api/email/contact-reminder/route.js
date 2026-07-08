import { NextResponse } from "next/server";

// 사용 중단(deprecated): 회원가입 이메일이 항상 있으므로 "연락처 추가 안내 메일"은 불필요.
// 라우트만 남겨 410 반환(과거 호출 대비). 안전하게 삭제해도 됨.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ ok: false, error: "deprecated" }, { status: 410 });
}
