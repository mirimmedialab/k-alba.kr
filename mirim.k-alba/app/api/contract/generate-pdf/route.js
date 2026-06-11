import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * POST /api/contract/generate-pdf
 *
 * 서명 완료된 계약서의 PDF 생성
 *
 * Body = { contract_id: 123 }
 *
 * 흐름:
 *   1. 계약서 + 양측 서명 이미지 조회
 *   2. pdf-lib으로 A4 PDF 생성 (한글 폰트 임베드)
 *   3. 계약서 조항 (제1조~제7조) 텍스트 렌더링
 *   4. 양측 서명 이미지를 지정 위치에 삽입
 *   5. 하단에 메타데이터 (서명 일시, IP, 해시)
 *   6. Supabase Storage에 업로드
 *   7. contracts.pdf_url 업데이트
 *
 * 필요 npm:
 *   pdf-lib ^1.17.1
 *   @pdf-lib/fontkit ^1.1.1
 *
 * 한글 폰트:
 *   Pretendard 변형 또는 Noto Sans KR
 *   (public/fonts/NotoSansKR-Regular.ttf 배치 필요)
 *
 * Supabase Storage:
 *   버킷 이름: 'contracts' (공개 읽기)
 *   파일명: contract-{id}-{timestamp}.pdf
 */

// 내부 API 호출 검증 (sign API에서 트리거)
function isInternalCall(request) {
  const key = request.headers.get("x-internal-auth");
  return key === (process.env.INTERNAL_API_KEY || "internal");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { contract_id } = body;

    if (!contract_id) {
      return NextResponse.json(
        { ok: false, error: "contract_id 필요" },
        { status: 400 }
      );
    }

    // 인증: 내부 호출 또는 Bearer token
    const internal = isInternalCall(request);
    let userId = null;

    if (!internal) {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { ok: false, error: "인증 필요" },
          { status: 401 }
        );
      }
      const supabaseAuth = createClient(
        process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );
      const { data: userData } = await supabaseAuth.auth.getUser(authHeader.substring(7));
      userId = userData?.user?.id;
      if (!userId) {
        return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });
      }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 계약서 조회
    const { data: contract, error: cErr } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contract_id)
      .single();

    if (cErr || !contract) {
      return NextResponse.json(
        { ok: false, error: "계약서를 찾을 수 없음" },
        { status: 404 }
      );
    }

    // 권한 체크 (외부 호출 시)
    if (!internal) {
      if (contract.worker_id !== userId && contract.employer_id !== userId) {
        return NextResponse.json(
          { ok: false, error: "권한 없음" },
          { status: 403 }
        );
      }
    }

    if (!contract.worker_signed || !contract.employer_signed) {
      return NextResponse.json(
        { ok: false, error: "양측 서명이 완료되지 않았습니다." },
        { status: 400 }
      );
    }

    // ─── PDF 생성 ───
    const pdfBytes = await buildContractPdf(contract);

    // ─── Supabase Storage 업로드 ───
    const fileName = `contract-${contract_id}-${Date.now()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("contracts")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadErr) {
      console.error("[generate-pdf] upload failed:", uploadErr);
      return NextResponse.json(
        { ok: false, error: "PDF 업로드 실패: " + uploadErr.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("contracts")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // contracts.pdf_url 업데이트
    await supabase
      .from("contracts")
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", contract_id);

    return NextResponse.json({
      ok: true,
      pdf_url: pdfUrl,
      size_bytes: pdfBytes.length,
    });
  } catch (error) {
    console.error("[generate-pdf] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "PDF 생성 중 오류 발생" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════
// PDF 빌더
// ═══════════════════════════════════════════════
async function buildContractPdf(contract) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  // 한글 폰트 로드 (Supabase Storage 또는 public/fonts에서)
  let koreanFont;
  try {
    const fontUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://k-alba.kr"}/fonts/NotoSansKR-Regular.ttf`;
    const fontRes = await fetch(fontUrl);
    if (fontRes.ok) {
      const fontBytes = await fontRes.arrayBuffer();
      koreanFont = await pdf.embedFont(fontBytes);
    }
  } catch (e) {
    console.warn("[generate-pdf] Korean font load failed, using Helvetica");
  }
  const font = koreanFont || (await pdf.embedFont(StandardFonts.Helvetica));
  const fontBold = koreanFont || (await pdf.embedFont(StandardFonts.HelveticaBold));

  // A4 사이즈 (595 × 842 pt)
  let page = pdf.addPage([595, 842]);
  let y = 800;

  const draw = (text, opts = {}) => {
    const {
      x = 50,
      size = 10,
      color = rgb(0, 0, 0),
      bold = false,
      maxWidth = 495,
    } = opts;

    const f = bold ? fontBold : font;

    // 줄바꿈 처리
    const lines = String(text || "").split("\n");
    for (const line of lines) {
      // 긴 줄은 강제 줄바꿈
      let remaining = line;
      while (remaining) {
        const charsFit = Math.floor(maxWidth / (size * 0.6));
        const chunk = remaining.slice(0, charsFit);
        remaining = remaining.slice(charsFit);
        page.drawText(chunk, { x, y, size, font: f, color });
        y -= size + 4;

        if (y < 60) {
          page = pdf.addPage([595, 842]);
          y = 800;
        }
      }
    }
  };

  const drawLine = () => {
    page.drawLine({
      start: { x: 50, y },
      end: { x: 545, y },
      thickness: 0.5,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 10;
  };

  // ─── 헤더 ───
  draw("표준 근로계약서", { size: 20, bold: true, x: 200 });
  y -= 15;
  draw("(기간제 근로계약)", { size: 11, x: 240, color: rgb(0.4, 0.4, 0.4) });
  y -= 15;
  drawLine();

  // ─── 당사자 정보 ───
  draw("당사자 정보", { size: 13, bold: true });
  y -= 5;
  draw(`사업주: ${contract.employer_name || "-"} (${contract.company_name || "-"})`);
  draw(`사업자등록번호: ${contract.business_number || "-"}`);
  draw(`사업장 주소: ${contract.business_address || "-"} ${contract.address_detail || ""}`);
  draw(`연락처: ${contract.employer_phone || "-"}`);
  y -= 10;
  draw(`근로자: ${contract.worker_name || "-"}`);
  draw(`연락처: ${contract.worker_phone || "-"}`);
  y -= 10;
  drawLine();

  // ─── 제1조 ~ 제7조 ───
  const articles = [
    {
      title: "제1조 (근로계약 기간)",
      body: `계약 기간: ${contract.contract_start || "-"} ~ ${contract.contract_end || "-"}\n계약 형태: ${contract.contract_type || "기간제 근로계약"}`,
    },
    {
      title: "제2조 (근무 장소 및 업무 내용)",
      body: `근무 장소: ${contract.business_address || "-"}\n업무 내용: ${contract.job_description || "-"}\n업종: ${contract.job_type || "-"}`,
    },
    {
      title: "제3조 (근로 시간 및 휴일)",
      body: `근무 요일: ${Array.isArray(contract.work_days) ? contract.work_days.join(", ") : (contract.work_days || "-")}\n근무 시간: ${contract.work_start || "-"} ~ ${contract.work_end || "-"}\n휴게 시간: 근무 4시간마다 30분 (근로기준법 제54조)`,
    },
    {
      title: "제4조 (임금)",
      body: `임금 유형: ${contract.pay_type || "시급"}\n금액: ₩${Number(contract.pay_amount || 0).toLocaleString()}\n지급일: 매월 말일 또는 근무 종료 후 14일 이내\n지급 방법: 근로자 본인 명의 계좌 입금`,
    },
    {
      title: "제5조 (연차 유급휴가 및 사회보험)",
      body: "연차 유급휴가는 근로기준법 제60조에 따라 부여한다.\n사회보험(국민연금·건강보험·고용보험·산재보험)은 관련 법령에 따라 가입한다.",
    },
    {
      title: "제6조 (계약 해지 및 퇴직)",
      body: "계약 기간 중 해지 시 상대방에게 30일 전 서면 통보한다.\n근로자는 사유 발생 시 즉시 해지 가능 (임금 체불, 폭언 등).",
    },
    {
      title: "제7조 (기타)",
      body: "본 계약서에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따른다.\n본 계약은 카카오톡 챗봇 기반 K-ALBA 전자계약 시스템을 통해 체결되었으며, 전자서명법에 따라 효력을 갖는다.",
    },
  ];

  for (const art of articles) {
    if (y < 150) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    draw(art.title, { size: 12, bold: true });
    y -= 2;
    draw(art.body, { size: 10 });
    y -= 8;
  }

  // ─── 서명 영역 ───
  if (y < 220) {
    page = pdf.addPage([595, 842]);
    y = 800;
  }

  drawLine();
  y -= 10;
  draw("양 당사자는 위 계약 내용에 동의하고 아래와 같이 서명합니다.", {
    size: 10,
  });
  y -= 30;

  // 서명 이미지 임베드
  const signatureY = y - 100;

  // 근로자 서명
  if (contract.worker_signature) {
    try {
      const imgBytes = await fetch(contract.worker_signature)
        .then((r) => r.arrayBuffer())
        .catch(() => null);

      if (imgBytes) {
        const img = await pdf.embedPng(imgBytes);
        const imgDims = img.scale(0.3);
        page.drawImage(img, {
          x: 80,
          y: signatureY,
          width: Math.min(imgDims.width, 180),
          height: Math.min(imgDims.height, 80),
        });
      }
    } catch (e) {
      console.warn("[PDF] worker signature embed failed:", e);
    }
  }

  // 사장님 서명
  if (contract.employer_signature) {
    try {
      const imgBytes = await fetch(contract.employer_signature)
        .then((r) => r.arrayBuffer())
        .catch(() => null);

      if (imgBytes) {
        const img = await pdf.embedPng(imgBytes);
        const imgDims = img.scale(0.3);
        page.drawImage(img, {
          x: 340,
          y: signatureY,
          width: Math.min(imgDims.width, 180),
          height: Math.min(imgDims.height, 80),
        });
      }
    } catch (e) {
      console.warn("[PDF] employer signature embed failed:", e);
    }
  }

  // 서명 라벨
  y = signatureY - 10;
  page.drawLine({
    start: { x: 80, y: y },
    end: { x: 260, y: y },
    thickness: 0.5,
  });
  page.drawLine({
    start: { x: 340, y: y },
    end: { x: 520, y: y },
    thickness: 0.5,
  });
  y -= 15;

  page.drawText("근로자", {
    x: 80, y, size: 10, font: fontBold,
  });
  page.drawText(contract.worker_name || "", {
    x: 130, y, size: 10, font,
  });
  page.drawText("사업주", {
    x: 340, y, size: 10, font: fontBold,
  });
  page.drawText(contract.employer_name || "", {
    x: 390, y, size: 10, font,
  });
  y -= 14;

  page.drawText(
    `서명일: ${contract.worker_sign_date ? new Date(contract.worker_sign_date).toLocaleString("ko-KR") : "-"}`,
    { x: 80, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
  );
  page.drawText(
    `서명일: ${contract.employer_sign_date ? new Date(contract.employer_sign_date).toLocaleString("ko-KR") : "-"}`,
    { x: 340, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) }
  );
  y -= 30;

  // ─── 하단 메타데이터 ───
  drawLine();
  y -= 5;
  page.drawText(
    `본 문서는 K-ALBA 전자계약 시스템으로 발행됨 · 발행일시: ${new Date().toLocaleString("ko-KR")}`,
    { x: 50, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) }
  );
  y -= 10;
  if (contract.document_hash_at_signing) {
    page.drawText(
      `문서 해시: ${contract.document_hash_at_signing.substring(0, 16)}... (위변조 검증용)`,
      { x: 50, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) }
    );
    y -= 10;
  }
  page.drawText(
    "전자서명법 제3조에 따라 당사자 간 합의된 전자서명으로 효력을 갖습니다.",
    { x: 50, y, size: 7, font, color: rgb(0.5, 0.5, 0.5) }
  );

  return await pdf.save();
}
