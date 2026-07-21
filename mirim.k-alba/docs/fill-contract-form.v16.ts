import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// 단시간근로자 표준근로계약서(고용노동부 서식) 자동 작성 API
// v16 (2026-07-21): 사업주 주소 우측 이동, 서명 크기 추가 확대(우측 여백 활용).
//                   (v13~v15 유지: baseline 정렬 + "(서명)" 제거 후 실제 서명 배치)
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const FORM_URL =
  "https://uqgqqsescalotabaivee.supabase.co/storage/v1/object/public/forms/contract-form-1p-c4.pdf";
let formBytes: ArrayBuffer | null = null;
async function getForm(): Promise<ArrayBuffer> {
  if (formBytes) return formBytes;
  const r = await fetch(FORM_URL);
  if (!r.ok) throw new Error("form fetch failed: " + r.status);
  formBytes = await r.arrayBuffer();
  return formBytes;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const H = 842;
const PAGE_W = 595;
const SHIFT_X = -27.5;
const PITCH = 64.13;

const FONT_URLS = [
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf",
  "https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Regular.ttf",
];
let fontBytes: ArrayBuffer | null = null;
async function getFont(): Promise<ArrayBuffer> {
  if (fontBytes) return fontBytes;
  for (const url of FONT_URLS) {
    try { const r = await fetch(url); if (r.ok) { fontBytes = await r.arrayBuffer(); return fontBytes; } } catch (_) {}
  }
  throw new Error("font fetch failed");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const d = await req.json();
    const doc = await PDFDocument.load(await getForm());
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(await getFont(), { subset: false });
    const pg = doc.getPage(0);
    const black = rgb(0, 0, 0);
    const S = (v: unknown) => String(v ?? "").trim();
    const X = (x: number) => x + SHIFT_X;

    const center = (x0: number, x1: number, ymid: number, text: string, size: number) => {
      const t = S(text);
      if (!t) return;
      let s = size;
      while (s > 4.5 && font.widthOfTextAtSize(t, s) > x1 - x0) s -= 0.5;
      const w = font.widthOfTextAtSize(t, s);
      pg.drawText(t, { x: X((x0 + x1) / 2) - w / 2, y: H - ymid - s * 0.36, size: s, font, color: black });
    };
    const left = (x: number, xMax: number, ymid: number, text: string, size: number) => {
      const t = S(text);
      if (!t) return;
      let s = size;
      while (s > 4.5 && font.widthOfTextAtSize(t, s) > xMax - x) s -= 0.5;
      pg.drawText(t, { x: X(x), y: H - ymid - s * 0.36, size: s, font, color: black });
    };
    const check = (cx: number, cy: number) => {
      const c = X(cx);
      pg.drawLine({ start: { x: c - 3, y: H - cy - 0.5 }, end: { x: c - 0.5, y: H - cy - 3 }, thickness: 1.1, color: black });
      pg.drawLine({ start: { x: c - 0.5, y: H - cy - 3 }, end: { x: c + 3.5, y: H - cy + 3.5 }, thickness: 1.1, color: black });
    };
    const whiteRect = (x: number, topY: number, w: number, h: number) => {
      pg.drawRectangle({ x: X(x), y: H - topY - h, width: w, height: h, color: rgb(1, 1, 1) });
    };
    const drawSign = async (dataUrl: string, x0: number, x1: number, top: number, bottom: number) => {
      if (!dataUrl.startsWith("data:image/png;base64,")) return;
      try {
        const bin = Uint8Array.from(atob(dataUrl.slice(22)), (c) => c.charCodeAt(0));
        const img = await doc.embedPng(bin);
        const bw = x1 - x0, bh = bottom - top;
        const sc = Math.min(bw / img.width, bh / img.height);
        const w = img.width * sc, h = img.height * sc;
        pg.drawImage(img, { x: X(x0 + (bw - w) / 2), y: H - bottom + (bh - h) / 2, width: w, height: h });
      } catch (_) {}
    };

    // ─── 제목: 페이지 절대 중앙 (SHIFT 미적용) ───
    {
      const title = "단시간근로자 표준근로계약서";
      const ts = 15;
      const tw = font.widthOfTextAtSize(title, ts);
      const cx = PAGE_W / 2;
      const tymid = 81.5;
      const boxPadX = 26, boxPadY = 9;
      const boxW = tw + boxPadX * 2, boxH = ts + boxPadY * 2;
      pg.drawRectangle({ x: cx - boxW / 2, y: H - tymid - boxH / 2 + ts * 0.14, width: boxW, height: boxH, borderColor: black, borderWidth: 1.3 });
      const tx = cx - tw / 2, ty = H - tymid - ts * 0.36;
      pg.drawText(title, { x: tx, y: ty, size: ts, font, color: black });
      pg.drawText(title, { x: tx + 0.35, y: ty, size: ts, font, color: black });
    }

    center(95, 155, 117, d.employer_name, 11);
    center(292, 352, 117, d.worker_name, 11);
    center(172, 193, 148.5, d.start_y, 10);
    center(205, 215, 148.5, d.start_m, 10);
    center(226, 237, 148.5, d.start_d, 10);
    if (S(d.end_y)) left(279.5, 535, 148.5, `${S(d.end_y)}년 ${S(d.end_m)}월 ${S(d.end_d)}일까지`, 10.5);
    left(172, 529, 177.4, d.workplace, 12);
    left(178, 529, 193.0, d.job_desc, 12);
    const days = Array.isArray(d.days) ? d.days.slice(0, 6) : [];
    days.forEach((c: Record<string, string>, i: number) => {
      const o = PITCH * i;
      center(160 + o, 168 + o, 239.9, c.d, 9);
      center(160 + o, 180 + o, 262.3, c.hours, 10);
      center(158 + o, 174 + o, 285.0, c.sh, 10);
      center(183 + o, 193 + o, 286.3, c.sm, 6.5);
      center(158 + o, 174 + o, 307.8, c.eh, 10);
      center(183 + o, 193 + o, 309.1, c.em, 6.5);
      if (c.bsh) {
        center(162 + o, 176 + o, 329.8, c.bsh, 8.5);
        center(183 + o, 193 + o, 330.7, c.bsm, 6);
        center(166 + o, 178 + o, 343.8, c.beh, 8);
        center(183 + o, 193 + o, 344.5, c.bem, 6);
      }
    });
    center(175, 187, 373.3, d.rest_day, 11);
    pg.drawEllipse({ x: X(118), y: H - 404.0, xScale: 13, yScale: 6.8, borderColor: black, borderWidth: 1.1 });
    center(198, 273, 404.4, d.hourly, 11);
    check(387, 419);
    check(444, 435);
    center(258, 296, 450.8, d.overtime || "50", 11);
    center(288, 318, 495.2, d.payday, 11);
    if (d.method === "direct") check(286, 510.5); else check(478, 510.5);
    const ins = d.ins || {};
    if (ins.emp) check(99.5, 557);
    if (ins.ind) check(169.5, 557);
    if (ins.pen) check(239.5, 557);
    if (ins.hea) check(309.5, 557);
    center(268, 292, 697.5, d.sign_y, 11);
    center(311, 329, 697.5, d.sign_m, 11);
    center(335, 359, 697.5, d.sign_d, 11);
    center(196, 274, 712.8, d.company_name, 12);
    center(305, 372, 713.0, d.employer_phone, 10);
    left(192, 529, 728.6, d.biz_address, 11);
    center(194, 268, 743.9, d.employer_name2 || d.employer_name, 12);
    left(180, 529, 759.8, d.worker_address, 11);
    left(197, 360, 775.3, d.worker_phone, 11);
    center(176, 248, 790.6, d.worker_name2 || d.worker_name, 12);
    // 서명이 있으면 인쇄된 "(서명)" 글자를 흰색으로 덮고, 실제 서명을 크게(약간 우측) 배치
    if (S(d.employer_sign)) { whiteRect(266, 735, 40, 18); await drawSign(S(d.employer_sign), 282.5, 397.5, 732, 764); }
    if (S(d.worker_sign)) { whiteRect(260, 782, 40, 18); await drawSign(S(d.worker_sign), 282.5, 397.5, 778, 810); }

    const bytes = await doc.save();
    return new Response(bytes, {
      headers: { ...CORS, "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="contract.pdf"' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
