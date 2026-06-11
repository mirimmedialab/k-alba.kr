import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * POST /api/partwork/generate-confirmation
 *
 * 시간제취업확인서 PDF 자동 생성 (출입국·외국인청 제출용)
 *
 * Body = { partwork_id: "uuid" }
 *
 * 자동 처리:
 *   1. partwork_applications 조회
 *   2. 사장님 프로필에서 default_signature 자동 로드
 *   3. 학생 서명은 partwork_applications.student_signature 사용
 *   4. 출입국청 표준 양식 기반 PDF 생성
 *   5. Supabase Storage 업로드 → confirmation_pdf_url
 *
 * 양식 참고:
 *   출입국·외국인청 공식 "시간제취업 허가 신청서" 레이아웃
 *   (정확한 양식은 법무부 고시에 따라 변경 가능)
 *
 * 호출 시점:
 *   - 학생이 partwork_applications 제출 시 자동 (사장님 서명 있을 때)
 *   - 국제처 담당자가 승인 시 자동
 *   - 또는 수동 재생성 요청
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { partwork_id } = body;

    if (!partwork_id) {
      return NextResponse.json(
        { ok: false, error: "partwork_id 필요" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 인증 (본인 또는 내부)
    const internal = request.headers.get("x-internal-auth") === (process.env.INTERNAL_API_KEY || "internal");
    let callerId = null;
    if (!internal) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ ok: false, error: "인증 필요" }, { status: 401 });
      }
      const { data: userData } = await supabase.auth.getUser(authHeader.substring(7));
      callerId = userData?.user?.id;
      if (!callerId) {
        return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });
      }
    }

    // 신청서 조회
    const { data: app, error: appErr } = await supabase
      .from("partwork_applications")
      .select("*")
      .eq("id", partwork_id)
      .single();

    if (appErr || !app) {
      return NextResponse.json(
        { ok: false, error: "신청서를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!internal && app.user_id !== callerId) {
      return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
    }

    // ─── 사장님 서명 자동 로드 ───
    // contract_id가 있으면 계약서의 employer 프로필에서,
    // 없으면 employer_signature 필드 (수동 입력 받은 경우) 사용
    let employerSignature = app.employer_signature;

    if (!employerSignature && app.contract_id) {
      const { data: contract } = await supabase
        .from("contracts")
        .select("employer_id, employer_signature, employer_name")
        .eq("id", app.contract_id)
        .single();

      if (contract) {
        // 계약서에 서명 있으면 그것 사용
        employerSignature = contract.employer_signature;

        // 없으면 사장님 프로필의 기본 서명
        if (!employerSignature && contract.employer_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("default_signature, company_name, name")
            .eq("id", contract.employer_id)
            .single();

          if (profile?.default_signature) {
            employerSignature = profile.default_signature;

            // partwork_applications에 저장 (다음번 재사용)
            await supabase
              .from("partwork_applications")
              .update({
                employer_signature: employerSignature,
                employer_signature_at: new Date().toISOString(),
              })
              .eq("id", partwork_id);
          }
        }
      }
    }

    // ─── PDF 생성 ───
    const pdfBytes = await buildConfirmationPdf(app, employerSignature);

    // ─── Supabase Storage 업로드 ───
    const fileName = `partwork-${partwork_id}-${Date.now()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("partwork-confirmations")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[partwork/pdf] upload failed:", uploadErr);
      return NextResponse.json(
        { ok: false, error: "PDF 업로드 실패: " + uploadErr.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("partwork-confirmations")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // 업데이트
    await supabase
      .from("partwork_applications")
      .update({
        confirmation_pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", partwork_id);

    return NextResponse.json({
      ok: true,
      pdf_url: pdfUrl,
      has_employer_signature: !!employerSignature,
      size_bytes: pdfBytes.length,
    });
  } catch (error) {
    console.error("[partwork/pdf] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "PDF 생성 중 오류 발생" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════
// 시간제취업확인서 PDF 빌더
// ═══════════════════════════════════════════════
async function buildConfirmationPdf(app, employerSignature) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // 한글 폰트 로드
  let koreanFont;
  try {
    const fontUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr"}/fonts/NotoSansKR-Regular.ttf`;
    const fontRes = await fetch(fontUrl);
    if (fontRes.ok) {
      const fontBytes = await fontRes.arrayBuffer();
      koreanFont = await pdf.embedFont(fontBytes);
    }
  } catch (e) {
    console.warn("[partwork/pdf] Korean font load failed");
  }
  const font = koreanFont || (await pdf.embedFont(StandardFonts.Helvetica));
  const fontBold = koreanFont || (await pdf.embedFont(StandardFonts.HelveticaBold));

  // A4
  let page = pdf.addPage([595, 842]);
  let y = 790;

  const draw = (text, opts = {}) => {
    const { x = 50, size = 10, color = rgb(0, 0, 0), bold = false } = opts;
    const f = bold ? fontBold : font;
    page.drawText(String(text || ""), { x, y, size, font: f, color });
  };

  // ─── 헤더 ───
  draw("시간제취업 확인서", { size: 22, bold: true, x: 190 });
  y -= 28;
  draw("(Part-time Employment Confirmation)", { size: 11, x: 180, color: rgb(0.4, 0.4, 0.4) });
  y -= 20;

  page.drawLine({
    start: { x: 50, y }, end: { x: 545, y },
    thickness: 1.5,
  });
  y -= 20;

  draw("출입국·외국인청 제출용", { size: 10, x: 220, color: rgb(0.3, 0.3, 0.3) });
  y -= 28;

  // ─── Section 1: 신청인 정보 ───
  drawSectionHeader(page, "1. 신청인 (Applicant)", y, fontBold);
  y -= 22;

  drawField(page, y, font, fontBold, "성명 / Name", app.applicant_name);
  y -= 18;
  drawField(page, y, font, fontBold, "이메일 / Email", app.applicant_email || "-");
  y -= 18;
  drawField(page, y, font, fontBold, "연락처 / Phone", app.applicant_phone || "-");
  y -= 18;
  drawField(page, y, font, fontBold, "비자 종류 / Visa", app.visa);
  y -= 18;
  if (app.arrival_date) {
    drawField(page, y, font, fontBold, "입국일 / Arrival Date", app.arrival_date);
    y -= 18;
  }
  y -= 10;

  // ─── Section 2: 재학 정보 ───
  drawSectionHeader(page, "2. 재학 정보 (Enrollment)", y, fontBold);
  y -= 22;

  const courseLabels = {
    lang: "D-4 어학연수",
    as:   "전문학사 (2년제)",
    ug12: "학사 1~2학년",
    ug34: "학사 3~4학년",
    grad: "석·박사",
  };

  drawField(page, y, font, fontBold, "재학 대학 / University", app.university_name);
  y -= 18;
  drawField(page, y, font, fontBold, "인증 여부 / Certified", app.university_certified ? "✓ 교육부 인증대학" : "비인증");
  y -= 18;
  drawField(page, y, font, fontBold, "재학 과정 / Course", courseLabels[app.course] || app.course);
  y -= 18;
  drawField(page, y, font, fontBold, "TOPIK 급수 / Korean Level",
    app.topik_level === 0 ? "없음" : `${app.topik_level}급`);
  y -= 28;

  // ─── Section 3: 근무 정보 ───
  drawSectionHeader(page, "3. 근무처 및 조건 (Workplace)", y, fontBold);
  y -= 22;

  drawField(page, y, font, fontBold, "사업장 / Employer", app.employer_name);
  y -= 18;
  drawField(page, y, font, fontBold, "사업자번호 / Business No.", app.employer_business_no || "-");
  y -= 18;
  drawField(page, y, font, fontBold, "업무 / Position", app.position || "-");
  y -= 18;
  drawField(page, y, font, fontBold, "근무 요일 / Work Days", app.work_days || "-");
  y -= 18;
  drawField(page, y, font, fontBold, "주당 근무 시간 / Weekly Hours", `${app.weekly_hours}시간`);
  y -= 18;
  drawField(page, y, font, fontBold, "시급 / Hourly Pay", `₩${Number(app.hourly_pay || 0).toLocaleString()}`);
  y -= 18;
  drawField(page, y, font, fontBold, "계약 기간 / Contract Period",
    `${app.contract_start || "-"} ~ ${app.contract_end || "-"}`);
  y -= 18;
  drawField(page, y, font, fontBold, "신청 시점 / Season",
    app.season === "semester" ? "학기 중 (Semester)" : "방학 중 (Vacation)");
  y -= 28;

  // ─── Section 4: 자격 검증 결과 ───
  drawSectionHeader(page, "4. 자격 검증 (Eligibility Check)", y, fontBold);
  y -= 22;

  drawField(page, y, font, fontBold, "허용 시간 / Max Hours",
    app.validation_max_hours == null ? "무제한 (Unlimited)" : `주 ${app.validation_max_hours}시간`);
  y -= 18;
  drawField(page, y, font, fontBold, "검증 결과 / Validation",
    app.validation_passed ? "✓ 신청 자격 충족 (Passed)" : "✗ 미충족 (Failed)");
  y -= 28;

  // ─── Section 5: 서명 영역 ───
  drawSectionHeader(page, "5. 확인 및 서명 (Confirmation)", y, fontBold);
  y -= 30;

  // 사장님 확인 문구
  const confirmText = [
    "위 근로자를 당사 사업장에서 아래와 같은 조건으로 고용할 것을 확인합니다.",
    "The above employee will be hired at our business under the conditions specified above.",
  ];
  confirmText.forEach((line) => {
    draw(line, { size: 10 });
    y -= 14;
  });
  y -= 14;

  // 서명 영역 (사장님 왼쪽, 학생 오른쪽)
  const signatureY = y - 70;

  // 사장님 서명 삽입
  if (employerSignature) {
    try {
      const imgBytes = await fetch(employerSignature)
        .then((r) => r.arrayBuffer())
        .catch(() => null);

      if (imgBytes) {
        const img = await pdf.embedPng(imgBytes);
        page.drawImage(img, {
          x: 70,
          y: signatureY,
          width: 150,
          height: 70,
        });
      }
    } catch (e) {
      console.warn("[PDF] employer signature failed:", e);
    }
  } else {
    // 서명 없으면 점선 박스
    drawDashedBox(page, 70, signatureY, 150, 70);
  }

  // 학생 서명 삽입
  if (app.student_signature) {
    try {
      const imgBytes = await fetch(app.student_signature)
        .then((r) => r.arrayBuffer())
        .catch(() => null);

      if (imgBytes) {
        const img = await pdf.embedPng(imgBytes);
        page.drawImage(img, {
          x: 350,
          y: signatureY,
          width: 150,
          height: 70,
        });
      }
    } catch (e) {
      console.warn("[PDF] student signature failed:", e);
    }
  } else {
    drawDashedBox(page, 350, signatureY, 150, 70);
  }

  // 서명선 + 라벨
  y = signatureY - 10;
  page.drawLine({ start: { x: 70, y }, end: { x: 220, y }, thickness: 0.5 });
  page.drawLine({ start: { x: 350, y }, end: { x: 500, y }, thickness: 0.5 });
  y -= 14;

  draw("사업주 (Employer)", { size: 9, x: 70, bold: true });
  draw("학생 본인 (Student)", { size: 9, x: 350, bold: true });
  y -= 13;

  draw(app.employer_name || "-", { size: 9, x: 70 });
  draw(app.applicant_name || "-", { size: 9, x: 350 });
  y -= 12;

  if (app.employer_signature_at) {
    draw(`서명일: ${new Date(app.employer_signature_at).toLocaleDateString("ko-KR")}`,
      { size: 8, x: 70, color: rgb(0.4, 0.4, 0.4) });
  }
  if (app.student_signature_at) {
    draw(`서명일: ${new Date(app.student_signature_at).toLocaleDateString("ko-KR")}`,
      { size: 8, x: 350, color: rgb(0.4, 0.4, 0.4) });
  }
  y -= 30;

  // ─── 하단 메타 ───
  page.drawLine({
    start: { x: 50, y }, end: { x: 545, y },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
  });
  y -= 12;

  draw(
    `본 문서는 K-ALBA PartWork 시스템으로 발행됨 · 발행일시: ${new Date().toLocaleString("ko-KR")}`,
    { x: 50, y, size: 7, color: rgb(0.5, 0.5, 0.5) }
  );
  y -= 10;
  draw(
    `Application ID: ${app.id.substring(0, 8)} · 재학 대학: ${app.university_name}`,
    { x: 50, y, size: 7, color: rgb(0.5, 0.5, 0.5) }
  );

  return await pdf.save();
}

function drawSectionHeader(page, text, y, fontBold) {
  page.drawRectangle({
    x: 50, y: y - 2, width: 495, height: 18,
    color: rgb(0.96, 0.94, 0.88),
  });
  page.drawText(text, {
    x: 55, y: y + 3, size: 11, font: fontBold,
    color: rgb(0.04, 0.09, 0.16),
  });
  page.drawLine({
    start: { x: 50, y: y - 2 }, end: { x: 50, y: y + 16 },
    thickness: 3, color: rgb(0.72, 0.58, 0.29), // gold
  });
}

function drawField(page, y, font, fontBold, label, value) {
  page.drawText(label, {
    x: 60, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(String(value || "-"), {
    x: 220, y, size: 10, font, color: rgb(0, 0, 0),
  });
}

function drawDashedBox(page, x, y, w, h) {
  // 점선으로 서명 영역 표시
  const dashLen = 3;
  const gapLen = 3;

  for (let i = 0; i < w; i += dashLen + gapLen) {
    page.drawLine({
      start: { x: x + i, y: y + h },
      end: { x: Math.min(x + i + dashLen, x + w), y: y + h },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });
    page.drawLine({
      start: { x: x + i, y: y },
      end: { x: Math.min(x + i + dashLen, x + w), y: y },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });
  }
  for (let i = 0; i < h; i += dashLen + gapLen) {
    page.drawLine({
      start: { x: x, y: y + i },
      end: { x: x, y: Math.min(y + i + dashLen, y + h) },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });
    page.drawLine({
      start: { x: x + w, y: y + i },
      end: { x: x + w, y: Math.min(y + i + dashLen, y + h) },
      thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });
  }

  page.drawText("서명", {
    x: x + w / 2 - 12,
    y: y + h / 2 - 5,
    size: 9,
    color: rgb(0.7, 0.7, 0.7),
  });
}
