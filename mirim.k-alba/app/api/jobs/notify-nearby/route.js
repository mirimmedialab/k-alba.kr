import { NextResponse } from "next/server";

/**
 * 새 공고 등록 시 근처 구독자에게 푸시 알림 발송
 *
 * POST /api/notifications/notify-nearby-job
 * Body = { job_id: "uuid" }
 *
 * 호출 시점:
 *   1. 공고 등록 직후 자동 호출 (post-job page)
 *   2. 관리자가 수동으로 재발송
 *
 * 흐름:
 *   1. DB 함수 find_users_to_notify_for_job(job_id) 호출
 *   2. 반경 내 push_token을 가진 사용자 리스트 반환
 *   3. FCM으로 일괄 전송 (최대 500명씩 multicast)
 *   4. notifications 테이블에 발송 로그 기록
 *
 * 환경변수:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (RLS 우회하여 모든 사용자 조회 가능해야 함)
 *   FIREBASE_SERVER_KEY         (Firebase Cloud Messaging 서버 키)
 *
 * Firebase 설정:
 *   1. https://console.firebase.google.com → 프로젝트 만들기
 *   2. 프로젝트 설정 → 클라우드 메시징 → 서버 키 (Legacy)
 *   3. Vercel 환경변수에 FIREBASE_SERVER_KEY=... 등록
 */

import { createClient } from "@supabase/supabase-js";

// ────────── FCM 발송 (Legacy HTTP API) ──────────
async function sendFcmMulticast(tokens, notification) {
  const { title, body, data } = notification;
  const KEY = process.env.FIREBASE_SERVER_KEY;
  if (!KEY) {
    console.error("[notify] FIREBASE_SERVER_KEY not configured");
    return { success: 0, failure: tokens.length, results: [] };
  }

  // FCM Legacy HTTP API는 한 번에 1000개까지 registration_ids 허용
  const CHUNK = 500;
  const results = [];
  let totalSuccess = 0;
  let totalFailure = 0;

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const batch = tokens.slice(i, i + CHUNK);

    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title: notification.title,
            body: notification.body,
            sound: "default",
            badge: 1,
          },
          data: notification.data || {},
          priority: "high",
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.error(`[notify] FCM ${res.status}`);
        totalFailure += batch.length;
        continue;
      }

      const data = await res.json();
      totalSuccess += data.success || 0;
      totalFailure += data.failure || 0;
      if (data.results) results.push(...data.results);
    } catch (e) {
      console.error("[notify] FCM batch failed:", e.message);
      totalFailure += batch.length;
    }
  }

  return { success: totalSuccess, failure: totalFailure, results };
}

// ────────── 메인 핸들러 ──────────
export async function POST(request) {
  try {
    const { job_id } = await request.json();
    if (!job_id) {
      return NextResponse.json({ ok: false, error: "job_id 필요" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. 공고 정보 가져오기
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, title, company_name, pay_amount, pay_type, sigungu, address")
      .eq("id", job_id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ ok: false, error: "공고를 찾을 수 없음" }, { status: 404 });
    }

    // 2. 알림 대상 조회 (DB 함수)
    const { data: targets, error: targetErr } = await supabase.rpc(
      "find_users_to_notify_for_job",
      { job_id }
    );

    if (targetErr) {
      console.error("[notify] target lookup failed:", targetErr);
      return NextResponse.json({ ok: false, error: targetErr.message }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "반경 내 알림 대상자가 없습니다.",
        count: 0,
      });
    }

    // 3. notifications 테이블에 로그 기록
    const logEntries = targets.map((t) => ({
      user_id: t.user_id,
      type: "new_nearby_job",
      title: `📍 ${t.distance_km}km 근처에 새 공고가 있어요`,
      body: `${job.title} · ${job.company_name} · ₩${Number(job.pay_amount || 0).toLocaleString()} ${job.pay_type || ""}`,
      data: {
        job_id: job.id,
        distance_km: String(t.distance_km),
        type: "new_nearby_job",
      },
      sent: false,
    }));

    await supabase.from("notifications").insert(logEntries);

    // 4. FCM 발송
    const tokens = targets.map((t) => t.token);
    const fcmResult = await sendFcmMulticast(tokens, {
      title: `📍 근처에 새 알바 공고!`,
      body: `${job.title} · ${job.sigungu || ""} · ₩${Number(job.pay_amount || 0).toLocaleString()}`,
      data: {
        job_id: job.id,
        type: "new_nearby_job",
      },
    });

    // 5. 발송 상태 업데이트
    await supabase
      .from("notifications")
      .update({ sent: true, sent_at: new Date().toISOString() })
      .in("user_id", targets.map((t) => t.user_id))
      .eq("data->>job_id", job.id);

    return NextResponse.json({
      ok: true,
      targets_count: targets.length,
      fcm_success: fcmResult.success,
      fcm_failure: fcmResult.failure,
    });
  } catch (error) {
    console.error("[notify] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "알림 발송 중 오류 발생" },
      { status: 500 }
    );
  }
}
