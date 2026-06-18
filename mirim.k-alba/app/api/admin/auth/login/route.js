import { NextResponse } from "next/server";
import { adminCredsOk, adminSessionToken, ADMIN_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/auth/login  { id, pw } */
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const id = String(body?.id || "");
  const pw = String(body?.pw || "");

  if (!process.env.ADMIN_PW) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  if (!adminCredsOk(id, pw)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7일
  });
  return res;
}
