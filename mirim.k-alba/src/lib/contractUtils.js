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
export function buildContractFromJob(job, employerProfile = null) {
  const parsedHours = parseWorkHours(job.work_hours);
  const parsedDays = parseWorkDays(job.work_days);
  const today = new Date();
  const contractStart = today.toISOString().split("T")[0];
  const contractEnd = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate())
    .toISOString()
    .split("T")[0];

  let wageCalc;
  if (job.pay_type === "시급" && parsedHours) {
    wageCalc = calcMonthlyWage(job.pay_amount, parsedHours.hours, parsedDays.length);
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
    // 근로자 정보 (비워둠 - 지원자가 입력)
    worker_name: "",
    worker_phone: "",
    // 계약 조건
    contract_type: "기간제 근로계약",
    contract_start: contractStart,
    contract_end: contractEnd,
    job_description: job.description || job.title,
    job_type: job.job_type,
    work_days: parsedDays,
    work_start: parsedHours?.start || "09:00",
    work_end: parsedHours?.end || "18:00",
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
    status: "draft", // draft | worker_signing | employer_signing | completed
  };
}

// 날짜 포맷 (2026-05-01 → 2026년 5월 1일)
export function formatKoreanDate(dateStr) {
  if (!dateStr) return "____년 ____월 ____일";
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}
