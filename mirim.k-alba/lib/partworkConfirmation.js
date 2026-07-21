"use client";
// ─── 유학생 시간제취업 확인서 — 공식 서식 PDF 다운로드 ───
//
// 출입국·외국인청 공식 양식 원본(공유 Storage: forms/form.pdf) 위에 값을
// 오버레이하는 K-ALBA 운영 엣지 함수(fill-partwork-form)를 호출한다.
//   - 양식 개정 시 Storage의 forms/form.pdf만 교체하면 모든 환경에 즉시 반영
//   - 발행일자는 자동 기입하지 않음 — 양식의 "20  .  .  ."에 손글씨 작성
//   - 유학생담당자 확인란(하단)은 공란 유지 (대학 국제처 작성 영역)
// (2026-07-20, html2canvas 서식 복제 방식에서 교체)

const FN_URL =
  "https://uqgqqsescalotabaivee.supabase.co/functions/v1/fill-partwork-form";
// K-ALBA 운영 프로젝트 publishable anon key (클라이언트 공개용 키)
const FN_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxZ3Fxc2VzY2Fsb3RhYmFpdmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjkzODAsImV4cCI6MjA5MTcwNTM4MH0.OedUy05i70sLh4uw88RHNWDgY11m059fjOjk0N_Bni4";

const DAY_KEYS = {
  월: "day_mon",
  화: "day_tue",
  수: "day_wed",
  목: "day_thu",
  금: "day_fri",
  토: "day_sat",
  일: "day_sun",
};
const WEEKDAYS = ["월", "화", "수", "목", "금"];

// "14:00(:00)" → "14" / "14:30:00" → "14:30" (양식 요일 칸이 좁아 압축 표기)
function shortTime(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return !m || m === "00" ? String(Number(h)) : `${Number(h)}:${m}`;
}

// "2026-07-10" → "2026.07.10"
function fmtDate(d) {
  return d ? String(d).slice(0, 10).replace(/-/g, ".") : "";
}

const fmtH = (h) => (Math.round(h * 10) / 10).toString().replace(/\.0$/, "");

export async function downloadPartworkConfirmationPDF(contract, sf = {}, wp = {}) {
  const days = contract.work_days || [];

  // 1일 실근로시간 (휴게시간 제외)
  let dailyH = 0;
  if (contract.work_start && contract.work_end) {
    const [sh, sm] = String(contract.work_start).split(":").map(Number);
    const [eh, em] = String(contract.work_end).split(":").map(Number);
    dailyH = eh + em / 60 - (sh + sm / 60);
    if (dailyH <= 0) dailyH += 24;
    dailyH -= (Number(contract.break_minutes) || 0) / 60;
  }
  const weekdayTotal = days.filter((d) => WEEKDAYS.includes(d)).length * dailyH;
  const weekendTotal = days.filter((d) => !WEEKDAYS.includes(d)).length * dailyH;

  const timeRange =
    contract.work_start && contract.work_end
      ? `${shortTime(contract.work_start)}-${shortTime(contract.work_end)}`
      : "";

  const ep = contract.employer || {}; // 계약서에 업체정보가 비어 있으면 사장님 프로필에서 보완
  const hourly =
    contract.hourly_pay ||
    (/시급|hourly/i.test(String(contract.pay_type || "")) ? contract.pay_amount : null);

  const semester = sf.semester
    ? /^\d+$/.test(String(sf.semester).trim())
      ? `${String(sf.semester).trim()}학기`
      : sf.semester
    : "";

  // 휴게시간 각주 — 요일별 시간(휴게 포함)과 총 시간(휴게 제외)의 기준을 명시
  const bm = Number(contract.break_minutes) || 0;
  let breakNote = "";
  if (bm > 0) {
    let breakRange = "";
    if (contract.break_start) {
      const [bh, bmin] = String(contract.break_start).split(":").map(Number);
      const endTotal = bh * 60 + (bmin || 0) + bm;
      const pad = (n) => String(n).padStart(2, "0");
      breakRange = `${pad(bh)}:${pad(bmin || 0)}~${pad(Math.floor(endTotal / 60) % 24)}:${pad(endTotal % 60)}, `;
    }
    breakNote = `※ 요일별 시간은 휴게시간(${breakRange}${bm}분) 포함 출퇴근 시각이며, 평일·주말 총 시간은 휴게시간 제외 실근로시간임`;
  }

  const payload = {
    name: contract.worker_name || "",
    arc_no: sf.alien_reg_no || wp.alien_reg_number || "",
    major: sf.department || "",
    semester,
    phone: wp.phone || contract.worker_phone || "",
    email: wp.email || "",
    company: contract.business_name || contract.company_name || ep.company_name || "",
    biz_no: contract.business_number || ep.business_number || "",
    biz_type: sf.industry || contract.job_type || "",
    address: contract.business_address || contract.workplace || ep.business_address || "",
    employer: contract.employer_name || ep.name || "",
    work_phone: contract.employer_phone || ep.phone || "",
    period: `${fmtDate(contract.contract_start)} ~ ${fmtDate(contract.contract_end)}`,
    wage: hourly ? `시급 ${Number(hourly).toLocaleString()}원` : "",
    employer_sign: contract.employer_signature || "", // 고용주 전자서명 오버레이(v8)
    weekday_hours: weekdayTotal > 0 ? fmtH(weekdayTotal) : "",
    weekend_hours: weekendTotal > 0 ? fmtH(weekendTotal) : "",
    break_note: breakNote,
  };
  for (const d of days) {
    const key = DAY_KEYS[d];
    if (key && timeRange) payload[key] = timeRange;
  }

  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: FN_KEY,
      Authorization: `Bearer ${FN_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let msg = `확인서 생성 실패 (HTTP ${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg += `: ${j.error}`;
    } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `K-ALBA_시간제취업확인서_${(contract.worker_name || "student").replace(/[\s\/\\]/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
