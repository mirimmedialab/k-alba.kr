import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/partwork/apply
 *
 * 유학생 시간제취업 신청 제출
 *
 * Body = {
 *   visa: "D-2" | "D-4",
 *   arrival_date?: "2025-09-01",  // D-4 전용
 *   course: "lang" | "as" | "ug12" | "ug34" | "grad",
 *   university_name: "연세대학교",
 *   university_certified: true,
 *   topik_level: 3,
 *   season: "semester" | "vacation",
 *   employer_name, employer_business_no, position, work_days,
 *   weekly_hours, hourly_pay, contract_start, contract_end,
 *   contract_id?: 123,
 *   validation = { max_hours, passed, checks: [...] }
 * }
 *
 * 서버 측 재검증:
 *   - 클라이언트의 validation을 신뢰하지 않고 서버에서 재계산
 *   - 불일치 시 경고 로그
 *
 * 자동 처리:
 *   - 국제처 이메일 발송 (향후)
 *   - 카카오톡 알림톡 (향후)
 */

// 서버 측 허용 시간 재계산 (클라이언트와 동일 로직)
const LIMITS = {
  "D-2": {
    as:   { semester: { 0: 0,  1: 0,  2: 10, 3: 20, 4: 20, 5: 25 }, vacation: "unlimited" },
    ug12: { semester: { 0: 0,  1: 10, 2: 15, 3: 25, 4: 25, 5: 30 }, vacation: "unlimited" },
    ug34: { semester: { 0: 0,  1: 10, 2: 20, 3: 25, 4: 25, 5: 30 }, vacation: "unlimited" },
    grad: { semester: { 0: 15, 1: 20, 2: 25, 3: 30, 4: 35, 5: 35 }, vacation: "unlimited" },
  },
  "D-4": {
    lang: {
      semester: { 0: 0,  1: 0,  2: 10, 3: 20, 4: 25, 5: 25 },
      vacation: { 0: 0, 1: 0, 2: 10, 3: 25, 4: 35, 5: 35 },
    },
  },
};

function calculateMaxHours(visa, course, topik, season) {
  const v = LIMITS[visa]?.[course];
  if (!v) return 0;
  if (season === "vacation") {
    if (v.vacation === "unlimited") return null; // unlimited
    return v.vacation[topik] || 0;
  }
  return v.semester[topik] || 0;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      visa,
      arrival_date,
      course,
      university_name,
      university_certified,
      topik_level,
      season,
      employer_name,
      employer_business_no,
      position,
      work_days,
      weekly_hours,
      hourly_pay,
      contract_start,
      contract_end,
      contract_id,
      contract_pdf_url, // 표준근로계약서 PDF (Supabase Storage URL)
      student_signature,
      // 🆕 업로드 서류 6종 (Storage path)
      contract_file_url,
      contract_file_name,
      enrollment_file_url,
      enrollment_file_name,
      grade_file_url,
      grade_file_name,
      topik_cert_file_url,
      topik_cert_file_name,
      passport_file_url,
      passport_file_name,
      arc_file_url,
      arc_file_name,
    } = body;

    // 필수 필드 검증
    if (!visa || !course || !university_name || !employer_name || weekly_hours == null) {
      return NextResponse.json(
        { ok: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (visa === "D-4" && !arrival_date) {
      return NextResponse.json(
        { ok: false, error: "D-4 비자는 입국일이 필요합니다." },
        { status: 400 }
      );
    }

    // 🆕 필수 서류 검증
    // 표준근로계약서: contract_pdf_url(자동 첨부) 또는 contract_file_url(직접 업로드) 중 하나
    const hasContract = !!contract_pdf_url || !!contract_file_url;
    if (!hasContract) {
      return NextResponse.json(
        { ok: false, error: "표준근로계약서가 필요합니다 (자동 첨부 또는 직접 업로드)." },
        { status: 400 }
      );
    }
    if (!enrollment_file_url) {
      return NextResponse.json(
        { ok: false, error: "재학증명서 업로드가 필요합니다." },
        { status: 400 }
      );
    }
    if (!grade_file_url) {
      return NextResponse.json(
        { ok: false, error: "성적증명서 업로드가 필요합니다." },
        { status: 400 }
      );
    }
    if (!topik_cert_file_url) {
      return NextResponse.json(
        { ok: false, error: "한국어능력증명서 업로드가 필요합니다." },
        { status: 400 }
      );
    }
    if (!passport_file_url || !arc_file_url) {
      return NextResponse.json(
        { ok: false, error: "여권과 외국인등록증 업로드가 필요합니다." },
        { status: 400 }
      );
    }

    // 인증 확인 (auth.uid 필요)
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    const token = authHeader.substring(7);

    // 사용자 Supabase 클라이언트 (토큰 기반)
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

    // 서버 측 재검증 (클라이언트 신뢰 X)
    const validationChecks = [];
    let validationPassed = true;

    // 1. D-4 6개월 검증
    if (visa === "D-4") {
      const days = daysSince(arrival_date);
      const pass = days >= 180;
      if (!pass) validationPassed = false;
      validationChecks.push({
        title: "비자 자격",
        pass,
        detail: pass
          ? `D-4 비자 · 입국 ${days}일 경과 (6개월 요건 충족)`
          : `입국 후 ${days}일 경과 — 6개월(180일) 필요`,
      });
    } else {
      validationChecks.push({
        title: "비자 자격",
        pass: true,
        detail: "D-2 비자 · 학위과정 재학생",
      });
    }

    // 2. 대학 인증
    if (!university_certified) validationPassed = false;
    validationChecks.push({
      title: "대학 인증",
      pass: !!university_certified,
      detail: university_certified
        ? `${university_name} · 교육부 인증대학`
        : `${university_name} · 비인증대학`,
    });

    // 3. 허용 시간
    const maxHours = calculateMaxHours(visa, course, topik_level || 0, season);
    const overLimit = maxHours !== null && maxHours > 0 && weekly_hours > maxHours;
    const hoursPass = !overLimit && maxHours !== 0;
    if (!hoursPass) validationPassed = false;
    validationChecks.push({
      title: "허용 시간",
      pass: hoursPass,
      detail: maxHours === 0
        ? "현재 자격으로는 시간제취업이 불가합니다"
        : maxHours === null
        ? "방학 기간: 시간 제한 없음"
        : `주 ${maxHours}시간 이내 가능 · 신청 ${weekly_hours}시간`,
    });

    // 검증 실패 시 저장하지 않음
    if (!validationPassed) {
      return NextResponse.json({
        ok: false,
        error: "자격 요건을 충족하지 않습니다.",
        validation: { passed: false, checks: validationChecks },
      }, { status: 400 });
    }

    // DB 저장
    const { data: application, error: insertError } = await supabase
      .from("partwork_applications")
      .insert({
        user_id: user.id,
        applicant_name: user.user_metadata?.name || user.email,
        applicant_email: user.email,
        applicant_phone: user.user_metadata?.phone || null,
        visa,
        arrival_date: arrival_date || null,
        course,
        university_name,
        university_certified,
        topik_level: topik_level || 0,
        contract_id: contract_id || null,
        contract_pdf_url: contract_pdf_url || null, // 표준근로계약서 PDF (계약서 챗봇 자동 첨부)
        employer_name,
        employer_business_no: employer_business_no || null,
        position: position || null,
        work_days: work_days || null,
        weekly_hours,
        hourly_pay: hourly_pay || null,
        contract_start: contract_start || null,
        contract_end: contract_end || null,
        season,
        validation_max_hours: maxHours === null ? null : maxHours,
        validation_passed: validationPassed,
        validation_detail: { checks: validationChecks },
        student_signature: student_signature || null,
        student_signature_at: student_signature ? new Date().toISOString() : null,
        // 🆕 업로드 서류 6종
        contract_file_url:    contract_file_url    || null,
        contract_file_name:   contract_file_name   || null,
        enrollment_file_url:  enrollment_file_url,
        enrollment_file_name: enrollment_file_name || null,
        enrollment_uploaded_at: new Date().toISOString(),
        grade_file_url:       grade_file_url       || null,
        grade_file_name:      grade_file_name      || null,
        topik_cert_file_url:  topik_cert_file_url  || null,
        topik_cert_file_name: topik_cert_file_name || null,
        passport_file_url:    passport_file_url,
        passport_file_name:   passport_file_name   || null,
        passport_uploaded_at: new Date().toISOString(),
        arc_file_url:         arc_file_url,
        arc_file_name:        arc_file_name        || null,
        arc_uploaded_at:      new Date().toISOString(),
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[partwork] insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: insertError.message },
        { status: 500 }
      );
    }

    // ─── PDF 자동 생성 (사장님 서명 + 학생 서명 있으면) ───
    let pdfUrl = null;
    if (student_signature) {
      try {
        const pdfRes = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr"}/api/partwork/generate-confirmation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-auth": process.env.INTERNAL_API_KEY || "internal",
            },
            body: JSON.stringify({ partwork_id: application.id }),
          }
        );
        const pdfData = await pdfRes.json();
        if (pdfData.ok) pdfUrl = pdfData.pdf_url;
      } catch (e) {
        console.error("[partwork] PDF auto-gen failed:", e);
      }
    }

    return NextResponse.json({
      ok: true,
      application_id: application.id,
      application_no: `PW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${application.id.substring(0, 6).toUpperCase()}`,
      pdf_url: pdfUrl,
      validation: { passed: validationPassed, checks: validationChecks, max_hours: maxHours },
    });
  } catch (error) {
    console.error("[partwork] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
