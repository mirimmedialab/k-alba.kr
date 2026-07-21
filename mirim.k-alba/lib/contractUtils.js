// 최저시급 (2026년 기준)
export const MIN_WAGE = 10030;

// 시급 기반 월급 계산
export function calcMonthlyWage(hourlyWage, hoursPerDay, daysPerWeek) {
  const weeklyHours = hoursPerDay * daysPerWeek;
  const monthlyBasic = Math.round(hourlyWage * weeklyHours * 4.345);

  // 주휴수당: 주 15시간 이상 근무 시
  let monthlyHoliday = 0;
  if (weeklyHours >= 15) {
    const weeklyHoliday = hourlyWage * (weeklyHours / 5);
    monthlyHoliday = Math.round(weeklyHoliday * 4.345);
  }

  return {
    basic: monthlyBasic,
    holiday: monthlyHoliday,
    total: monthlyBasic + monthlyHoliday,
    weeklyHours,
  };
}

// 일급 기반 월급 계산
export function calcMonthlyDailyWage(dailyWage, daysPerWeek) {
  const monthlyDays = Math.round(daysPerWeek * 4.345);
  return {
    basic: dailyWage * monthlyDays,
    holiday: 0,
    total: dailyWage * monthlyDays,
    weeklyHours: 0,
  };
}

// 4대보험 가입 대상 여부
export function isInsuranceRequired(weeklyHours) {
  return weeklyHours >= 15;
}

// 시급 검증
export function validateWage(amount, payType) {
  if (payType === "시급") {
    if (amount < MIN_WAGE) {
      return { valid: false, message: `최저시급(${MIN_WAGE.toLocaleString()}원) 미만입니다` };
    }
    return { valid: true, message: "✓ 최저임금 충족" };
  }
  return { valid: true, message: "✓ 확인됨" };
}

// 근무시간 문자열 파싱 (예: "14:00~20:00" → {start, end, hours})
export function parseWorkHours(workHours) {
  if (!workHours) return null;
  const m = workHours.match(/(\d{1,2}):?(\d{0,2})\s*[~\-]\s*(\d{1,2}):?(\d{0,2})/);
  if (!m) return null;
  const startH = parseInt(m[1], 10);
  const endH = parseInt(m[3], 10);
  const start = `${String(startH).padStart(2, "0")}:${m[2] || "00"}`;
  const end = `${String(endH).padStart(2, "0")}:${m[4] || "00"}`;
  const hours = endH > startH ? endH - startH : 24 - startH + endH;
  return { start, end, hours };
}

// 근무 요일 파싱 (예: "평일 (월~금)" → ["월","화","수","목","금"])
export function parseWorkDays(workDays) {
  if (!workDays) return [];
  if (Array.isArray(workDays)) return workDays;
  if (workDays.includes("평일")) return ["월", "화", "수", "목", "금"];
  if (workDays.includes("주말")) return ["토", "일"];
  if (workDays.includes("매일")) return ["월", "화", "수", "목", "금", "토", "일"];
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.filter((d) => workDays.includes(d));
}

// 계약서 기본 정보 생성 (공고 데이터로부터)
// opts.createdBy: "employer"(기본, 사장님 작성) | "worker"(알바생 작성 → 사장님 승인 필요)
// opts.workerProfile: 알바생 작성 시 본인 프로필 (worker_id/이름/연락처 자동 입력)
export function buildContractFromJob(job, employerProfile = null, opts = {}) {
  const { createdBy = "employer", workerProfile = null } = opts;
  const parsedHours = parseWorkHours(job.work_hours);
  const parsedDays = parseWorkDays(job.work_days);
  const today = new Date();
  const contractStart = today.toISOString().split("T")[0];
  const contractEnd = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())
    .toISOString()
    .split("T")[0];

  // 공고에 휴게시간(무급)이 있으면 실근로시간 기준으로 계산
  const jobBreakMin = job.break_minutes === 30 || job.break_minutes === 60 ? job.break_minutes : null;

  let wageCalc;
  if (job.pay_type === "시급" && parsedHours) {
    const netHours = Math.max(0, parsedHours.hours - (jobBreakMin || 0) / 60);
    wageCalc = calcMonthlyWage(job.pay_amount, netHours, parsedDays.length);
  } else if (job.pay_type === "일급") {
    wageCalc = calcMonthlyDailyWage(job.pay_amount, parsedDays.length);
  } else {
    wageCalc = { basic: job.pay_amount, holiday: 0, total: job.pay_amount, weeklyHours: 0 };
  }

  return {
    // 사장님 정보
    employer_name: employerProfile?.name || job.employer?.name || "",
    company_name: employerProfile?.company_name || job.employer?.company_name || "",
    business_number: employerProfile?.business_number || "",
    employer_phone: employerProfile?.phone || "",
    business_address: job.address || employerProfile?.business_address || "",
    address_detail: job.address_detail || "",
    // 근로자 정보 (알바생 작성 시 본인 프로필로 자동 입력)
    worker_id: workerProfile?.id || null,
    worker_name: workerProfile?.name || "",
    worker_phone: workerProfile?.phone || "",
    // 계약 조건
    contract_type: "기간제 근로계약",
    contract_start: contractStart,
    contract_end: contractEnd,
    job_description: job.description || job.title,
    job_type: job.job_type,
    work_days: parsedDays,
    work_start: parsedHours?.start || "09:00",
    work_end: parsedHours?.end || "18:00",
    // 공고의 휴게시간 자동 반영 (계약 챗봇에서 양측 확인 후 확정)
    break_minutes: jobBreakMin,
    break_start: (() => {
      if (!jobBreakMin) return null;
      const [sh, sm] = (parsedHours?.start || "09:00").split(":").map(Number);
      const [eh, em] = (parsedHours?.end || "18:00").split(":").map(Number);
      let s = sh * 60 + sm;
      let e = eh * 60 + em;
      if (e <= s) e += 1440;
      let st = Math.round(((s + e) / 2 - jobBreakMin / 2) / 30) * 30;
      if (st < s) st = s;
      if (st + jobBreakMin > e) st = e - jobBreakMin;
      const mm = ((st % 1440) + 1440) % 1440;
      return `${String(Math.floor(mm / 60)).padStart(2, "0")}:${String(mm % 60).padStart(2, "0")}`;
    })(),
    // 급여
    pay_type: job.pay_type,
    pay_amount: job.pay_amount,
    monthly_basic: wageCalc.basic,
    monthly_holiday: wageCalc.holiday,
    monthly_total: wageCalc.total,
    weekly_hours: wageCalc.weeklyHours,
    insurance_required: isInsuranceRequired(wageCalc.weeklyHours),
    // 서명 상태
    worker_signed: false,
    employer_signed: false,
    worker_sign_date: null,
    employer_sign_date: null,
    // 연결 정보
    job_id: job.id,
    employer_id: job.employer_id || employerProfile?.id,
    // 작성 주체 — 사장님 작성이 원칙, 알바생 작성 시 사장님 승인(pending_approval) 필요
    created_by: createdBy,
    // status: draft | pending_approval | rejected | worker_signing | employer_signing | completed
    status: createdBy === "worker" ? "pending_approval" : "draft",
  };
}

// 날짜 포맷 (2026-05-01 → 2026년 5월 1일)
export function formatKoreanDate(dateStr) {
  if (!dateStr) return "____년 ____월 ____일";
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}
