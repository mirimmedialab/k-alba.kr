import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * POST /api/contract/sign
 *
 * 계약서 전자서명 처리
 *
 * Body = {
 *   contract_id: 123,
 *   role: "worker" | "employer",
 *   signature_png: "data:image/png;base64,...",
 *   meta = {
 *     strokeCount, pointCount, duration, width, height, hash
 *   },
 *   location?: { latitude, longitude, accuracy }
 * }
 *
 * 동작:
 *   1. 인증 확인 (Bearer token)
 *   2. 계약서 접근 권한 체크 (본인 worker_id/employer_id 일치)
 *   3. 계약서 내용 해시 계산 (document_hash)
 *   4. contracts 테이블 업데이트 (서명 이미지 + 타임스탬프)
 *   5. signature_audit_log에 감사 기록 추가
 *   6. (옵션) PDF 생성 트리거 (양측 모두 서명 시)
 *
 * 보안:
 *   - service_role로 RLS 우회하되, user_id는 jwt에서 검증
 *   - 이미 서명된 경우 재서명 차단
 *   - 서명 이미지 크기 제한 (500KB 이하)
 */

function deviceInfoFromUA(ua) {
  const mobile = /Mobile|Android|iPhone/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const android = /Android/i.test(ua);
  const mac = /Macintosh/i.test(ua);
  const win = /Windows/i.test(ua);

  return {
    device_type: tablet ? "tablet" : mobile ? "mobile" : "desktop",
    platform: ios ? "ios" : android ? "android" : mac ? "macos" : win ? "windows" : "web",
    browser: /Chrome/i.test(ua) && !/Edg/i.test(ua) ? "chrome"
           : /Safari/i.test(ua) && !/Chrome/i.test(ua) ? "safari"
           : /Firefox/i.test(ua) ? "firefox"
           : /Edg/i.test(ua) ? "edge"
           : "other",
  };
}

function hashDocument(contract) {
  // 계약서 주요 내용을 결정론적 문자열로 만들어 해시
  const content = JSON.stringify({
    employer: contract.employer_name,
    company: contract.company_name,
    business_no: contract.business_number,
    worker: contract.worker_name,
    start: contract.contract_start,
    end: contract.contract_end,
    job: contract.job_description,
    days: contract.work_days,
    start_time: contract.work_start,
    end_time: contract.work_end,
    pay_type: contract.pay_type,
    pay_amount: contract.pay_amount,
  });
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { contract_id, role, signature_png, meta = {}, location } = body;

    if (!contract_id || !role || !signature_png) {
      return NextResponse.json(
        { ok: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (!["worker", "employer"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "잘못된 역할입니다." },
        { status: 400 }
      );
    }

    // 서명 이미지 크기 제한 (500KB)
    if (signature_png.length > 500 * 1024) {
      return NextResponse.json(
        { ok: false, error: "서명 이미지가 너무 큽니다. 다시 서명해 주세요." },
        { status: 400 }
      );
    }

    // 인증
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: "인증 실패" },
        { status: 401 }
      );
    }
    const user = userData.user;

    // 계약서 조회
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (cErr || !contract) {
      return NextResponse.json(
        { ok: false, error: "계약서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 체크
    if (role === "worker" && contract.worker_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "근로자 서명 권한이 없습니다." },
        { status: 403 }
      );
    }
    if (role === "employer" && contract.employer_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: "사장님 서명 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 이미 서명한 경우 차단
    if (role === "worker" && contract.worker_signed) {
      return NextResponse.json(
        { ok: false, error: "이미 근로자 서명이 완료되었습니다." },
        { status: 400 }
      );
    }
    if (role === "employer" && contract.employer_signed) {
      return NextResponse.json(
        { ok: false, error: "이미 사장님 서명이 완료되었습니다." },
        { status: 400 }
      );
    }

    // 감사 데이터 수집
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
            || request.headers.get("x-real-ip")
            || null;
    const userAgent = request.headers.get("user-agent") || "";
    const deviceInfo = deviceInfoFromUA(userAgent);

    // 문서 해시 (서명 시점의 계약서 내용)
    const documentHash = hashDocument(contract);

    // 서명 이미지 해시
    const signatureHash = crypto
      .createHash("sha256")
      .update(signature_png)
      .digest("hex");

    const now = new Date().toISOString();

    // ─── 1. contracts 업데이트 ───
    const updates = {};
    if (role === "worker") {
      updates.worker_signed = true;
      updates.worker_signature = signature_png;
      updates.worker_sign_date = now;
      updates.worker_signature_at = now;
      updates.worker_signature_ip = ip;
    } else {
      updates.employer_signed = true;
      updates.employer_signature = signature_png;
      updates.employer_sign_date = now;
      updates.employer_signature_at = now;
      updates.employer_signature_ip = ip;
    }

    // 양측 모두 서명 완료 시
    const willBothSigned =
      (role === "worker" && contract.employer_signed) ||
      (role === "employer" && contract.worker_signed);

    if (willBothSigned) {
      updates.status = "completed";
      updates.document_hash_at_signing = documentHash;
    } else {
      updates.status = role === "worker" ? "employer_signing" : "worker_signing";
    }

    const { error: updErr } = await supabase
      .from("contracts")
      .update(updates)
      .eq("id", contract_id);

    if (updErr) {
      console.error("[contract/sign] update error:", updErr);
      return NextResponse.json(
        { ok: false, error: updErr.message },
        { status: 500 }
      );
    }

    // ─── 2. 감사 로그 추가 ───
    const signerName = role === "worker" ? contract.worker_name : contract.employer_name;

    const { error: auditErr } = await supabase
      .from("signature_audit_log")
      .insert({
        contract_id,
        user_id: user.id,
        role,
        signer_name: signerName,
        signature_png,
        signature_hash: signatureHash,
        stroke_count: meta.strokeCount || null,
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceInfo.device_type,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        location_lat: location?.latitude || null,
        location_lng: location?.longitude || null,
        location_accuracy: location?.accuracy || null,
        document_hash: documentHash,
      });

    if (auditErr) {
      // 감사 로그 실패는 치명적 — 계약서 업데이트 롤백
      console.error("[contract/sign] audit log failed:", auditErr);
      // 이미 업데이트됐지만 경고 남김
      return NextResponse.json(
        {
          ok: false,
          error: "감사 로그 기록에 실패했습니다. 관리자에게 문의하세요.",
          detail: auditErr.message,
        },
        { status: 500 }
      );
    }

    // ─── 3. 사장님 서명은 profile에 저장 (재사용) ───
    if (role === "employer") {
      await supabase
        .from("profiles")
        .update({
          default_signature: signature_png,
          default_signature_updated_at: now,
        })
        .eq("id", user.id);
    }

    // ─── 4. 양측 서명 완료 시 PDF 생성 트리거 ───
    let pdfUrl = null;
    if (willBothSigned) {
      try {
        const pdfRes = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr"}/api/contract/generate-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-auth": process.env.INTERNAL_API_KEY || "internal",
            },
            body: JSON.stringify({ contract_id }),
          }
        );
        const pdfData = await pdfRes.json();
        if (pdfData.ok) pdfUrl = pdfData.pdf_url;
      } catch (e) {
        console.error("[contract/sign] PDF generation failed:", e);
        // PDF 실패는 치명적이지 않음 - 나중에 재시도 가능
      }
    }

    return NextResponse.json({
      ok: true,
      contract_id,
      both_signed: willBothSigned,
      pdf_url: pdfUrl,
      signed_at: now,
      audit: {
        device: deviceInfo.device_type,
        platform: deviceInfo.platform,
        ip_recorded: !!ip,
      },
    });
  } catch (error) {
    console.error("[contract/sign] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "서명 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
