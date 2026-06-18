import { NextResponse } from "next/server";
import { adminCredsOk, adminSessionToken, ADMIN_COOKIE } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 간단한 IP 기반 무차별 대입 방어 (인메모리).
 * 주의: 서버리스(Vercel)에서는 인스턴스별 메모리라 인스턴스 간 공유되지 않고
 *       콜드스타트 시 초기화된다. 완벽한 방어는 아니며 공격 비용을 높이는 용도.
 *       강력한 방어가 필요하면 Upstash/DB 기반 카운터로 교체 권장.
 */
const WINDOW_MS = 10 * 60 * 1000; // 10분
const MAX_FAILS = 5; // 창 내 최대 실패 횟수
const LOCK_MS = 15 * 60 * 1000; // 초과 시 잠금 시간

const attempts = new Map(); // ip -> { fails, firstAt, lockUntil }

function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

function checkLock(ip) {
  const rec = attempts.get(ip);
  if (!rec) return { locked: false };
  const now = Date.now();
  if (rec.lockUntil && rec.lockUntil > now) {
    return { locked: true, retryAfter: Math.ceil((rec.lockUntil - now) / 1000) };
  }
  return { locked: false };
}

function recordFail(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(ip, { fails: 1, firstAt: now, lockUntil: 0 });
    return;
  }
  rec.fails += 1;
  if (rec.fails >= MAX_FAILS) rec.lockUntil = now + LOCK_MS;
}

/** POST /api/admin/auth/login  { id, pw } */
export async function POST(request) {
  if (!process.env.ADMIN_PW) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const ip = clientIp(request);
  const lock = checkLock(ip);
  if (lock.locked) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429, headers: { "Retry-After": String(lock.retryAfter) } }
    );
  }

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const id = String(body?.id || "");
  const pw = String(body?.pw || "");

  if (!adminCredsOk(id, pw)) {
    recordFail(ip);
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  // 성공 → 카운터 초기화
  attempts.delete(ip);

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
