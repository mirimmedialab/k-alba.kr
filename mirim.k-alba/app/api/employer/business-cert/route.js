import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * 사업자등록증 업로드/조회 API (국제처 시간제취업 확인서 검토용)
 *
 * POST (multipart/form-data: file)
 *   사장님 본인이 사업자등록증(JPG/PNG/WEBP/PDF, 10MB 이하)을 업로드.
 *   partwork-documents 비공개 버킷의 {user.id}/business_cert_*.ext 에 저장하고
 *   profiles.business_cert_* 에 기록. 재업로드 시 교체.
 *
 * GET ?application_id=... | (없으면 본인 것)
 *   - application_id 있음: 해당 시간제취업 신청서의 근무처 사업자등록증 조회.
 *     권한: 신청자 본인 / 활성 대학 담당자(university_staff) / 해당 사업자 본인.
 *     신청서의 employer_business_no 와 profiles.business_number 를 대조해 찾음.
 *   - application_id 없음: 로그인한 사장님 본인의 등록증 상태 조회.
 *   응답: { ok, exists, file_name, uploaded_at, signed_url(1시간) }
 */

const BUCKET = "partwork-documents";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

// 문서 종류: 사업자등록증 / 사장님 신분증(마스킹본)
const DOC_COLS = {
  business_cert: { path: "business_cert_path", name: "business_cert_name", at: "business_cert_uploaded_at" },
  id_card: { path: "id_card_path", name: "id_card_name", at: "id_card_uploaded_at" },
};

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

async function getCaller(req, supabase) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(authHeader.substring(7));
  return data?.user || null;
}

const digits = (s) => String(s || "").replace(/[^0-9]/g, "");

export async function POST(req) {
  try {
    const supabase = svc();
    const user = await getCaller(req, supabase);
    if (!user) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    const docType = DOC_COLS[formData.get("doc_type")] ? String(formData.get("doc_type")) : "business_cert";
    const cols = DOC_COLS[docType];
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "파일이 필요합니다." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ ok: false, error: "JPG, PNG, WEBP, PDF 파일만 업로드 가능합니다." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ ok: false, error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const storagePath = `${user.id}/${docType}_${Date.now()}.${ext}`;

    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("[business-cert] upload failed:", uploadError);
      return NextResponse.json({ ok: false, error: "업로드 실패: " + uploadError.message }, { status: 500 });
    }

    // 이전 파일 정리 (best-effort)
    const { data: prev } = await supabase
      .from("profiles").select(cols.path).eq("id", user.id).maybeSingle();
    if (prev?.[cols.path] && prev[cols.path] !== storagePath) {
      await supabase.storage.from(BUCKET).remove([prev[cols.path]]).catch(() => {});
    }

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        [cols.path]: storagePath,
        [cols.name]: file.name,
        [cols.at]: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (dbErr) {
      return NextResponse.json({ ok: false, error: "저장 실패: " + dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, file_name: file.name, uploaded_at: new Date().toISOString() });
  } catch (e) {
    console.error("[business-cert] POST error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const supabase = svc();
    const user = await getCaller(req, supabase);
    if (!user) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("application_id");

    let employerProfile = null;

    if (applicationId) {
      const { data: app } = await supabase
        .from("partwork_applications")
        .select("id, user_id, employer_business_no")
        .eq("id", applicationId)
        .maybeSingle();
      if (!app) return NextResponse.json({ ok: false, error: "신청서를 찾을 수 없습니다." }, { status: 404 });

      // 권한: 신청자 본인 / 활성 대학 담당자 / 해당 사업자 본인
      let authorized = app.user_id === user.id;
      if (!authorized) {
        const { data: staffRow } = await supabase
          .from("university_staff").select("id").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
        authorized = !!staffRow;
      }
      const bizNo = digits(app.employer_business_no);
      if (!bizNo) return NextResponse.json({ ok: true, exists: false, reason: "no_business_no" });

      // 사업자번호로 사장님 프로필 찾기 (하이픈 유무 모두 대응)
      const formatted = bizNo.length === 10 ? `${bizNo.slice(0, 3)}-${bizNo.slice(3, 5)}-${bizNo.slice(5)}` : bizNo;
      const { data: employers } = await supabase
        .from("profiles")
        .select("id, business_number, business_cert_path, business_cert_name, business_cert_uploaded_at, id_card_path, id_card_name, id_card_uploaded_at")
        .in("business_number", [bizNo, formatted]);
      employerProfile = (employers || []).find((p) => digits(p.business_number) === bizNo) || null;

      if (!authorized && employerProfile?.id !== user.id) {
        return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
      }
    } else {
      // 본인 상태 조회
      const { data: me } = await supabase
        .from("profiles")
        .select("id, business_cert_path, business_cert_name, business_cert_uploaded_at, id_card_path, id_card_name, id_card_uploaded_at")
        .eq("id", user.id)
        .maybeSingle();
      employerProfile = me;
    }

    // 문서별 서명 URL 생성 헬퍼
    const docInfo = async (cols) => {
      const path = employerProfile?.[cols.path];
      if (!path) return { exists: false };
      const { data: urlData, error: urlErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (urlErr) return { exists: false, error: urlErr.message };
      return {
        exists: true,
        file_name: employerProfile[cols.name],
        uploaded_at: employerProfile[cols.at],
        signed_url: urlData.signedUrl,
      };
    };

    const cert = await docInfo(DOC_COLS.business_cert);
    const idCard = await docInfo(DOC_COLS.id_card);

    // 하위호환: 최상위 필드는 사업자등록증, id_card는 별도 객체
    return NextResponse.json({ ok: true, ...cert, id_card: idCard });
  } catch (e) {
    console.error("[business-cert] GET error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
