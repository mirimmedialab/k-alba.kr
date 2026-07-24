import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseResumeText } from "@/lib/resumeParse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * 이력서 파일 파싱 API
 *
 * POST (multipart/form-data: file — PDF/DOCX/TXT, 10MB 이하)
 *   업로드된 이력서에서 텍스트를 추출하고, 섹션 휴리스틱으로
 *   { intro, skills, languages, experiences, education, certificates } 초안을 만들어 반환.
 *   ※ 저장하지 않음 — 프론트에서 사용자가 확인·수정 후 worker_resumes에 저장한다.
 *   ※ 파일 원본도 저장하지 않음 (텍스트 추출 후 즉시 폐기, 개인정보 최소 수집)
 */

const MAX_SIZE = 10 * 1024 * 1024;

function svc() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

async function getCaller(req, supabase) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  const { data } = await supabase.auth.getUser(h.substring(7));
  return data?.user || null;
}

// ── 텍스트 추출 ──
async function extractText(file) {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const out = await pdfParse(buf);
    return out.text || "";
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ buffer: buf });
    return out.value || "";
  }
  if (type.startsWith("text/") || name.endsWith(".txt")) {
    return buf.toString("utf-8");
  }
  throw new Error("PDF, DOCX(Word), TXT 파일만 지원합니다. (한글 HWP는 PDF로 변환 후 올려주세요)");
}

export async function POST(req) {
  try {
    const supabase = svc();
    const user = await getCaller(req, supabase);
    if (!user) return NextResponse.json({ ok: false, error: "인증이 필요합니다." }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "파일이 필요합니다." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ ok: false, error: "파일 크기는 10MB 이하여야 합니다." }, { status: 400 });
    }

    const text = await extractText(file);
    if (!text.trim()) {
      return NextResponse.json({ ok: false, error: "파일에서 텍스트를 찾지 못했습니다. 스캔 이미지 PDF라면 텍스트가 포함된 파일로 다시 시도해 주세요." }, { status: 422 });
    }

    const draft = parseResumeText(text);
    return NextResponse.json({ ok: true, draft, file_name: file.name, chars: text.length });
  } catch (e) {
    console.error("[resume-parse] error:", e);
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
