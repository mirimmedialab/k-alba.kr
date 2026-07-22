"use client";
// ─── 근로계약서 — 고용노동부 표준서식(단시간근로자) PDF 다운로드 ───
//
// 공식 서식 원본(공유 Storage: forms/contract-form.pdf, 밑줄 제거판) 위에
// 계약 값을 오버레이하는 K-ALBA 운영 엣지 함수(fill-contract-form)를 호출한다.
//   - 서식 개정 시 Storage의 forms/contract-form.pdf만 교체하면 즉시 반영
//   - 양측 전자서명 이미지가 "(서명)" 자리에 자동 삽입됨
// (2026-07-21, html2canvas 미리보기 캡처 방식에서 교체)

const FN_URL =
  "https://uqgqqsescalotabaivee.supabase.co/functions/v1/fill-contract-form";
const FN_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3Fxc2VzY2Fsb3RhYmFpdmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjkzODAsImV4cCI6MjA5MTcwNTM4MH0.OedUy05i70sLh4uw88RHNWDgY11m059fjOjk0N_Bni4";

const REST_DAY_CANDIDATES = ["일", "토", "월", "화", "수", "목", "금"];

function dParts(dateStr) {
  const s = String(dateStr || "").slice(0, 10);
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) } : { y: "", m: "", d: "" };
}
function hm(t) {
  const [h, m] = String(t || "").split(":");
  return { h: h ? String(Number(h)) : "", m: m || "00" };
}
function fmtH(h) {
  return (Math.round(h * 10) / 10).toString().replace(/\.0$/, "");
}

// 모바일·인앱 브라우저(카카오톡/네이버/라인/인스타 등)는 blob 다운로드가 막히는 경우가 많아
// 서버가 Storage에 올린 실제 링크로 받도록 분기한다.
function isMobileOrInApp() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod|KAKAOTALK|NAVER|Line\/|Instagram|FB[AV]|Daum|; ?wv\)/i.test(ua);
}

export async function downloadStandardContractPDF(contract, filename) {
  const c = contract || {};
  const wp = c.worker || {};
  const ep = c.employer || {};
  const days = Array.isArray(c.work_days) ? c.work_days : [];

  // 1일 실근로시간(휴게 제외)
  let dailyH = 0;
  if (c.work_start && c.work_end) {
    const [sh, sm] = String(c.work_start).split(":").map(Number);
    const [eh, em] = String(c.work_end).split(":").map(Number);
    dailyH = eh + (em || 0) / 60 - (sh + (sm || 0) / 60);
    if (dailyH <= 0) dailyH += 24;
    dailyH -= (Number(c.break_minutes) || 0) / 60;
  }
  const st = hm(c.work_start);
  const en = hm(c.work_end);
  // 휴게시간 시작·종료
  let brk = null;
  const bm = Number(c.break_minutes) || 0;
  if (bm > 0 && c.break_start) {
    const [bh, bmin] = String(c.break_start).split(":").map(Number);
    const endTotal = bh * 60 + (bmin || 0) + bm;
    brk = {
      sh: String(bh), sm: String(bmin || 0).padStart(2, "0"),
      eh: String(Math.floor(endTotal / 60) % 24), em: String(endTotal % 60).padStart(2, "0"),
    };
  }
  const dayRows = days.slice(0, 6).map((d) => ({
    d,
    hours: dailyH > 0 ? fmtH(dailyH) : "",
    sh: st.h, sm: st.m, eh: en.h, em: en.m,
    ...(brk ? { bsh: brk.sh, bsm: brk.sm, beh: brk.eh, bem: brk.em } : {}),
  }));

  const restDay =
    c.rest_day || REST_DAY_CANDIDATES.find((d) => !days.includes(d)) || "일";

  // 사회보험 판정 (산재는 무조건, 나머지는 주15시간·비자 기준)
  const visa = String(wp.visa || "");
  const isStudent = /D-?2|D-?4/i.test(visa);
  const isResident = /F-?2|F-?5|F-?6/i.test(visa);
  const wk = Number(c.weekly_hours) || 0;
  const ins = {
    ind: 1,
    hea: wk >= 15 ? 1 : 0,
    pen: wk >= 15 && !isStudent ? 1 : 0,
    emp: isResident ? 1 : (wk >= 15 && !isStudent && !visa ? 1 : 0),
  };

  const start = dParts(c.contract_start);
  const end = dParts(c.contract_end);
  const signDate = dParts(c.employer_sign_date || c.worker_sign_date || new Date().toISOString());
  const paydayNum = String(c.pay_day || "").match(/\d{1,2}/);

  const payload = {
    employer_name: c.employer_name || ep.name || "",
    worker_name: c.worker_name || wp.name || "",
    start_y: start.y, start_m: start.m, start_d: start.d,
    end_y: c.contract_end ? end.y : "", end_m: c.contract_end ? end.m : "", end_d: c.contract_end ? end.d : "",
    workplace: `${c.business_address || c.workplace || ep.business_address || ""}${c.address_detail ? ` ${c.address_detail}` : ""}`,
    job_desc: c.job_description || c.job_title || "",
    days: dayRows,
    rest_day: restDay,
    hourly: c.pay_amount ? Number(c.pay_amount).toLocaleString() : "",
    overtime: "50",
    payday: paydayNum ? paydayNum[0] : "말",
    method: "deposit",
    ins,
    sign_y: signDate.y, sign_m: signDate.m, sign_d: signDate.d,
    company_name: c.company_name || c.business_name || ep.company_name || "",
    employer_phone: c.employer_phone || ep.phone || "",
    biz_address: c.business_address || ep.business_address || "",
    worker_address: wp.address || "",
    worker_phone: c.worker_phone || wp.phone || "",
    employer_sign: c.employer_signature || "",
    worker_sign: c.worker_signature || "",
  };

  const dlName = filename || `K-ALBA_근로계약서_${(c.worker_name || "worker").replace(/[\s\/\\]/g, "_")}.pdf`;
  // 모바일/인앱 브라우저: 서버가 Storage에 올린 실제 다운로드 링크(강제 다운로드)로 받는다
  const viaUrl = isMobileOrInApp();
  if (viaUrl) {
    payload.upload = true;
    payload.filename = dlName;
  }

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: FN_KEY, Authorization: `Bearer ${FN_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `계약서 PDF 생성 실패 (HTTP ${res.status})`;
    try { const j = await res.json(); if (j?.error) msg += `: ${j.error}`; } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  if (viaUrl) {
    const data = await res.json();
    if (!data?.url) throw new Error("다운로드 링크 생성 실패");
    // Content-Disposition: attachment 이므로 이동 없이 다운로드가 시작된다
    window.location.href = data.url;
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dlName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 즉시 revoke 시 일부 브라우저에서 다운로드가 취소되는 문제 방지
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
