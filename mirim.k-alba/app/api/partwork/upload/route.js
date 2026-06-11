import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/partwork/upload
 *
 * PartWork 서류 업로드 (여권, 외국인등록증, 성적증명서, 출석확인서)
 *
 * 요청: multipart/form-data
 *   - file: File 객체 (이미지 또는 PDF)
 *   - doc_type: "passport" | "arc" | "transcript" | "attendance"
 *   - application_id?: UUID (기존 신청서에 추가 업로드 시)
 *
 * 보안:
 *   - 인증 필수 (Bearer token)
 *   - 파일 크기: 10MB 이하
 *   - 허용 MIME: image/jpeg, image/png, image/webp, application/pdf
 *   - Storage 경로: partwork-documents/{user_id}/{doc_type}_{timestamp}.{ext}
 *   - 비공개 버킷 → signed URL로만 접근
 *
 * 응답: { ok: true, file_url, file_name }
 */

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const VALID_DOC_TYPES = ["passport", "arc", "transcript", "attendance"];

export async function POST(request) {
  try {
    // 인증 체크
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

    // FormData 파싱
    const formData = await request.formData();
    const file = formData.get("file");
    const docType = formData.get("doc_type");
    const applicationId = formData.get("application_id");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!VALID_DOC_TYPES.includes(docType)) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 서류 종류입니다." },
        { status: 400 }
      );
    }

    // 파일 검증
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "JPG, PNG, WEBP, PDF 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 이름 생성 (확장자 보존)
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const timestamp = Date.now();
    const storagePath = `${user.id}/${docType}_${timestamp}.${ext}`;

    // Supabase Storage 업로드 (partwork-documents 비공개 버킷)
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("partwork-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[partwork/upload] failed:", uploadError);
      return NextResponse.json(
        { ok: false, error: "업로드 실패: " + uploadError.message },
        { status: 500 }
      );
    }

    // signed URL 생성 (24시간 유효)
    const { data: urlData, error: urlError } = await supabase.storage
      .from("partwork-documents")
      .createSignedUrl(storagePath, 60 * 60 * 24);

    if (urlError) {
      console.error("[partwork/upload] signed url failed:", urlError);
    }

    const signedUrl = urlData?.signedUrl || null;

    // application_id가 있으면 DB 레코드에도 업데이트
    if (applicationId) {
      const fieldMap = {
        passport:   { url: "passport_file_url", name: "passport_file_name", at: "passport_uploaded_at" },
        arc:        { url: "arc_file_url", name: "arc_file_name", at: "arc_uploaded_at" },
        transcript: { url: "transcript_file_url", name: "transcript_file_name", at: "transcript_uploaded_at" },
        attendance: { url: "attendance_file_url", name: "attendance_file_name", at: "attendance_uploaded_at" },
      };
      const f = fieldMap[docType];

      await supabase
        .from("partwork_applications")
        .update({
          [f.url]: storagePath,                       // 경로 저장 (나중에 다시 signed URL 생성)
          [f.name]: file.name,
          [f.at]: new Date().toISOString(),
        })
        .eq("id", applicationId)
        .eq("user_id", user.id);                      // 본인 신청서만
    }

    return NextResponse.json({
      ok: true,
      doc_type: docType,
      storage_path: storagePath,
      file_url: signedUrl,
      file_name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("[partwork/upload] error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "업로드 중 오류 발생" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════
// GET /api/partwork/upload?path=xxx  — signed URL 재발급
// ═══════════════════════════════════════════════
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "인증 필요" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path");
    if (!path) {
      return NextResponse.json({ ok: false, error: "path 필요" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: userData } = await supabase.auth.getUser(authHeader.substring(7));
    if (!userData?.user) {
      return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });
    }

    // 본인 파일만 접근 허용 (경로 첫 부분이 user.id)
    if (!path.startsWith(userData.user.id + "/")) {
      return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
    }

    const { data: urlData, error } = await supabase.storage
      .from("partwork-documents")
      .createSignedUrl(path, 60 * 60 * 24);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, file_url: urlData.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
