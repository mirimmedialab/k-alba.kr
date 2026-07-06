import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const pw = process.env.DASHBOARD_PASSWORD || "";
  if (!pw || body.password !== pw) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const hash = crypto.createHash("sha256").update(pw).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("kpi_auth", hash, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
