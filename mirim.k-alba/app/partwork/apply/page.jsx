"use client";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
export const dynamic = "force-dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, getProfile, supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import FileUpload from "@/components/FileUpload";

/**
 * /partwork/apply — 유학생 시간제취업 신청 페이지
 *
 * D-2/D-4 비자 유학생 대상, 외국인 유학생이 시간제(알바) 일자리에 대한
 * 국제처 사전 허가를 신청하는 시스템.
 *
 * 알바계약서 앱(KakaoTalk)에서 "국제처 신청하기" → 이 페이지로 연동.
 *
 * 4화면 구조 (실시간 게이지로 즉시 검증 피드백):
 *   S0: 연동 데이터 확인 (근무처/계약서 자동 로드 + 여권/외국인등록증 업로드)
 *   S1: 자격 요건 입력 (비자/재학/TOPIK) — 실시간 허용 시간 게이지 + 자격 검증
 *   S2: 최종 확인 + 학생 서명
 *   S3: 완료 (접수 번호 + PDF)
 *
 * 비자별 로직:
 *   D-2:
 *     - 학기 중: 한국어 수준별 10/20/25/30h
 *     - 방학: 무제한
 *     - 대학 인증 여부별 차등
 *   D-4:
 *     - 입국 후 6개월 경과 필수
 *     - 학기 중 10~25h, 방학 10~35h
 */

// ═══════════════════════════════════════════════
// 허용 시간 계산 테이블 (법무부 기준 2024)
// ═══════════════════════════════════════════════
const LIMITS = {
  // D-2 (정규 유학)
  "D-2": {
    lang:  { semester: { 0: 0,  1: 0,  2: 10, 3: 20, 4: 20, 5: 20 }, vacation: "unlimited" }, // 어학연수 과정 (D-2 내)
    as:    { semester: { 0: 0,  1: 0,  2: 10, 3: 20, 4: 20, 5: 25 }, vacation: "unlimited" },
    ug12:  { semester: { 0: 0,  1: 10, 2: 15, 3: 25, 4: 25, 5: 30 }, vacation: "unlimited" },
    ug34:  { semester: { 0: 0,  1: 10, 2: 20, 3: 25, 4: 25, 5: 30 }, vacation: "unlimited" },
    grad:  { semester: { 0: 15, 1: 20, 2: 25, 3: 30, 4: 35, 5: 35 }, vacation: "unlimited" },
  },
  // D-4 (일반연수, 어학연수)
  "D-4": {
    lang: { semester: { 0: 0,  1: 0,  2: 10, 3: 20, 4: 25, 5: 25 }, vacation: { 0: 0, 1: 0, 2: 10, 3: 25, 4: 35, 5: 35 } },
  },
};

const COURSE_LABELS = {
  lang: "D-4 어학연수",
  as:   "전문학사 (2년제)",
  ug12: "학사 1~2학년",
  ug34: "학사 3~4학년",
  grad: "석·박사",
};

const TOPIK_LABELS = { 0: "없음", 1: "1급", 2: "2급", 3: "3급", 4: "4급", 5: "5급" };

// ═══════════════════════════════════════════════
// 한국 공휴일 (2025-2026)
// ═══════════════════════════════════════════════
const HOLIDAYS_KR = {
  '2025-01-01':'신정','2025-01-28':'설날','2025-01-29':'설날','2025-01-30':'설날',
  '2025-03-01':'삼일절','2025-03-03':'삼일절 대체',
  '2025-05-05':'어린이날·부처님오신날','2025-05-06':'대체공휴일',
  '2025-06-03':'제21대 대통령선거','2025-06-06':'현충일',
  '2025-08-15':'광복절',
  '2025-10-03':'개천절','2025-10-05':'추석','2025-10-06':'추석','2025-10-07':'추석','2025-10-08':'대체공휴일',
  '2025-10-09':'한글날','2025-12-25':'성탄절',
  '2026-01-01':'신정','2026-02-16':'설날','2026-02-17':'설날','2026-02-18':'설날',
  '2026-03-01':'삼일절','2026-03-02':'대체공휴일',
  '2026-05-05':'어린이날','2026-05-24':'부처님오신날','2026-05-25':'대체공휴일',
  '2026-06-06':'현충일',
  '2026-08-15':'광복절','2026-08-17':'대체공휴일',
  '2026-09-24':'추석','2026-09-25':'추석','2026-09-26':'추석',
  '2026-10-03':'개천절','2026-10-05':'대체공휴일','2026-10-09':'한글날',
  '2026-12-25':'성탄절',
};

function fmtYMD(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

// 학사일정: 1학기 3월~6/21, 여름방학 6/22~8/31, 2학기 9월~12/21, 겨울방학 12/22~2월말
function getAcademicPeriod(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 1 || m === 2) return 'vacation';
  if (m >= 3 && m <= 5) return 'semester';
  if (m === 6 && d <= 21) return 'semester';
  if (m === 6 && d >= 22) return 'vacation';
  if (m === 7 || m === 8) return 'vacation';
  if (m >= 9 && m <= 11) return 'semester';
  if (m === 12 && d <= 21) return 'semester';
  return 'vacation';
}

function isHolidayKR(date) {
  return !!HOLIDAYS_KR[fmtYMD(date)];
}

function isWeekend(date) {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

// 계약서 기반 근무 패턴 자동 분석
function analyzeWorkPattern(contract) {
  if (!contract || !contract.work_days || !contract.contract_start || !contract.contract_end) return null;

  // work_days는 "월·수·금" 형식 또는 ["월","수","금"] 배열
  let workDayList;
  if (Array.isArray(contract.work_days)) {
    workDayList = contract.work_days;
  } else if (typeof contract.work_days === 'string') {
    workDayList = contract.work_days.split(/[·,\s]/).filter(Boolean);
  } else {
    return null;
  }

  const dayMap = {'일':0,'월':1,'화':2,'수':3,'목':4,'금':5,'토':6};
  const workDowSet = new Set();
  workDayList.forEach(d => { if (dayMap[d] !== undefined) workDowSet.add(dayMap[d]); });

  // 하루 근무시간 (work_start_time, work_end_time이 별도 필드라면 사용)
  // 없으면 weekly_hours / 일수로 추정
  let hoursPerDay = 0;
  if (contract.work_start_time && contract.work_end_time) {
    const sParts = String(contract.work_start_time).split(':');
    const eParts = String(contract.work_end_time).split(':');
    let sH = parseInt(sParts[0],10)||0, sM = parseInt(sParts[1],10)||0;
    let eH = parseInt(eParts[0],10)||0, eM = parseInt(eParts[1],10)||0;
    if (eH < sH) eH += 24;
    hoursPerDay = (eH*60 + eM - sH*60 - sM) / 60;
  } else if (contract.weekly_hours && workDayList.length > 0) {
    hoursPerDay = contract.weekly_hours / workDayList.length;
  }
  if (hoursPerDay < 0) hoursPerDay = 0;

  const weekdayDays = workDayList.filter(d => ['월','화','수','목','금'].includes(d));
  const weekendDays = workDayList.filter(d => ['토','일'].includes(d));

  const start = new Date(contract.contract_start);
  const end = new Date(contract.contract_end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const oneDay = 24*60*60*1000;
  const totalDays = Math.min(Math.floor((end - start) / oneDay) + 1, 366);

  const stats = { sem_weekday:0, sem_holiday:0, vacation:0, total:0 };
  const sampleHolidays = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i*oneDay);
    if (!workDowSet.has(d.getDay())) continue;
    stats.total++;
    const period = getAcademicPeriod(d);
    if (period === 'vacation') {
      stats.vacation++;
    } else {
      if (isWeekend(d) || isHolidayKR(d)) {
        stats.sem_holiday++;
        if (isHolidayKR(d) && sampleHolidays.length < 3) {
          sampleHolidays.push(fmtYMD(d) + ' ' + HOLIDAYS_KR[fmtYMD(d)]);
        }
      } else {
        stats.sem_weekday++;
      }
    }
  }

  const today = new Date();
  return {
    weekdayDays, weekendDays, hoursPerDay,
    weekdayHoursPerWeek: weekdayDays.length * hoursPerDay,
    weekendHoursPerWeek: weekendDays.length * hoursPerDay,
    hoursPerWeekRaw: workDayList.length * hoursPerDay,
    stats, sampleHolidays,
    contractStart: fmtYMD(start),
    contractEnd: fmtYMD(end),
    currentPeriod: getAcademicPeriod(today),
    today: fmtYMD(today),
  };
}

// 자동 분석 결과 표시 컴포넌트
// ═══════════════════════════════════════════════
// 시간제취업확인서 자동 생성 (한글 버전)
// 첨부된 양식(붙임 4-1)을 React에서 동일하게 재현.
// 유학생담당자 확인란만 비워둠 (학교에서 직접 작성).
// ═══════════════════════════════════════════════
function generateConfirmationFormHTML(contract, form, profile) {
  if (!contract) return '';
  profile = profile || {};
  const pat = analyzeWorkPattern(contract);
  const workDays = Array.isArray(contract.work_days)
    ? contract.work_days
    : (typeof contract.work_days === 'string' ? contract.work_days.split(/[·,\s]/).filter(Boolean) : []);

  let hoursPerDay = 0;
  if (contract.work_start_time && contract.work_end_time) {
    const sParts = String(contract.work_start_time).split(':');
    const eParts = String(contract.work_end_time).split(':');
    let sH = parseInt(sParts[0],10)||0, sM = parseInt(sParts[1],10)||0;
    let eH = parseInt(eParts[0],10)||0, eM = parseInt(eParts[1],10)||0;
    if (eH < sH) eH += 24;
    hoursPerDay = (eH*60 + eM - sH*60 - sM) / 60;
  } else if (contract.weekly_hours && workDays.length > 0) {
    hoursPerDay = contract.weekly_hours / workDays.length;
  }

  const weekdayDays = workDays.filter(d => ['월','화','수','목','금'].includes(d));
  const weekendDays = workDays.filter(d => ['토','일'].includes(d));
  const totalWeekday = Math.round(weekdayDays.length * hoursPerDay * 10)/10;
  const totalWeekend = Math.round(weekendDays.length * hoursPerDay * 10)/10;

  // 요일별 시간 표 셀
  const dayRow = ['월','화','수','목','금','토','일'].map(d => {
    const has = workDays.includes(d);
    return `<td style="text-align:center;padding:6px;border:1px solid #000;">${has ? hoursPerDay + 'h' : ''}</td>`;
  }).join('');

  const period = (contract.contract_start && contract.contract_end)
    ? `${contract.contract_start} ~ ${contract.contract_end}` : '';

  const courseLabel = ({lang:'어학연수', as:'전문학사', ug12:'학사 1~2학년', ug34:'학사 3~4학년', grad:'석박사'})[form?.course] || '';
  const isCertified = !!form?.univ?.certified;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth() + 1;
  const dd = today.getDate();

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>외국인 유학생 시간제 취업 확인서</title>
<style>
@page { size: A4; margin: 18mm 16mm; }
body { font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif; font-size: 11px; color: #000; line-height: 1.6; }
h1 { font-size: 16px; text-align: center; margin: 10px 0 18px; letter-spacing: 1px; }
.subtitle { font-size: 10px; color: #555; text-align: right; margin-bottom: 4px; }
table.form { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
table.form th, table.form td { border: 1px solid #000; padding: 6px 8px; vertical-align: middle; }
table.form th { background: #f0f0f0; font-weight: 700; text-align: center; width: 14%; font-size: 10.5px; }
table.form td { font-size: 11px; }
.section-label { background: #d9d9d9 !important; font-weight: 800; text-align: center; vertical-align: middle; }
.day-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.day-table th, .day-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 10.5px; }
.day-table th { background: #f0f0f0; }
.statement { padding: 14px 4px; font-size: 11.5px; line-height: 1.8; text-align: justify; margin: 16px 0 10px; }
.date-line { text-align: center; font-size: 12px; margin: 24px 0; letter-spacing: 4px; }
.notice { font-size: 10px; color: #333; line-height: 1.7; padding: 8px 6px; border-top: 1px dashed #999; margin-top: 8px; }
.notice strong { color: #000; }
.notice .warn { color: #b91c1c; font-weight: 700; }
.target { font-weight: 700; text-align: center; padding: 16px 0 12px; border-bottom: 1px solid #000; margin-bottom: 12px; font-size: 12px; }
.officer-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
.officer-table td { border: 1px solid #000; padding: 8px 10px; font-size: 11px; }
.officer-table .label { background: #f0f0f0; font-weight: 700; width: 18%; text-align: center; }
.officer-table .value { width: 32%; }
.fill { color: #1e40af; font-weight: 700; }
.empty { color: #999; font-style: italic; }
.print-btn { position: fixed; top: 8px; right: 8px; padding: 8px 14px; background: #00B37E; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
@media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF로 저장</button>
<div class="subtitle">붙임 4-1 외국인 유학생 시간제 취업 확인서(한글) - 대학 작성</div>
<h1>외국인 유학생 시간제 취업 확인서</h1>

<table class="form">
<tr>
<th rowspan="3" class="section-label">대상자</th>
<th>성 명</th><td class="fill">${form?.worker_name || contract.worker_name || ''}</td>
<th>외국인<br>등록번호</th><td class="${profile.alien_reg_number ? 'fill' : 'empty'}">${profile.alien_reg_number || '(외국인등록증 기재)'}</td>
</tr>
<tr>
<th>학과(전공)</th><td class="fill">${form?.univ?.name || ''}</td>
<th>이수학기</th><td class="fill">${courseLabel}</td>
</tr>
<tr>
<th>전화번호</th><td class="${profile.phone ? 'fill' : 'empty'}">${profile.phone || '(연락처 기재)'}</td>
<th>e-mail</th><td class="${profile.email ? 'fill' : 'empty'}">${profile.email || '(이메일 기재)'}</td>
</tr>
</table>

<table class="form">
<tr>
<th rowspan="6" class="section-label">취업<br>예정<br>근무처</th>
<th>업체명</th><td colspan="3" class="fill">${contract.employer_name || ''}</td>
</tr>
<tr>
<th>사업자<br>등록번호</th><td class="fill">${contract.employer_business_no || ''}</td>
<th>업종</th><td class="fill">${contract.position || contract.job_type || ''}</td>
</tr>
<tr>
<th>주 소</th><td colspan="3" class="fill">${contract.work_address || ''}</td>
</tr>
<tr>
<th>고용주</th><td class="fill">${contract.employer_contact || contract.employer_name || ''} (인 또는 서명)</td>
<th>전화번호</th><td class="empty">(고용주 연락처)</td>
</tr>
<tr>
<th>취업기간</th><td class="fill">${period}</td>
<th>급여(시급)</th><td class="fill">${contract.pay_amount ? Number(contract.pay_amount).toLocaleString() + '원' : ''}</td>
</tr>
<tr>
<th>근무시간</th>
<td colspan="3">
<div style="margin-bottom:6px;font-size:10.5px;">
평일: 총 <span class="fill">${totalWeekday}</span>시간 &nbsp;&nbsp;
주말: 총 <span class="fill">${totalWeekend}</span>시간
</div>
<table class="day-table">
<tr><th>요일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th></tr>
<tr><th>시간</th>${dayRow}</tr>
</table>
</td>
</tr>
</table>

<div class="statement">
위 유학생은 본교에 재학하고 있는 학생으로서 현재의 학습 및 연구 상황으로 볼 때, 상기 예정된 시간제취업 활동을 통해서는 학업(또는 연구 활동)에 지장이 없을 것으로 판단되므로, 이에 확인합니다.
</div>

<div class="date-line">${yyyy}. &nbsp;&nbsp; ${mm}. &nbsp;&nbsp; ${dd}.</div>

<div class="notice">
<div>※ 시간제취업허가 <strong>[한국어능력기준 제출자]</strong> 허용시간은 어학연수생은 주당 20시간, 학부과정은 주당 20시간 이내(인증대학은 25시간), 석박사과정은 주당 30시간 이내임.</div>
<div style="margin-top:4px;">▶ <strong>한국어능력기준(토픽 기준)</strong> : 어학연수 2급, 전문학사 3급, 학사(1~2학년) 3급, 학사(3~4학년) 4급, 석박사 4급이상 ◀</div>
<div style="margin-top:4px;">- 한국어 능력기준 미달할 경우 허용시간은 어학연수생과 학부생 10시간, 석박사과정 15시간으로 제한 -</div>
<div style="margin-top:6px;" class="warn">※ 시간제취업 허가 전 취업할 경우 [유학생과 고용주] 모두 처벌될 수 있습니다. (허가된 근무처에서만 취업 활동 가능)</div>
</div>

<div class="target">◌ ◌ 출입국 · 외국인청(사무소 · 출장소)장 귀하</div>

<table class="officer-table">
<tr>
<td class="label" rowspan="3">유학생<br>담당자<br>확인란</td>
<td class="label">소속</td><td class="value empty">(대학 작성)</td>
<td class="label">인증대학<br>여부</td><td class="value">
<span style="display:inline-block;width:14px;height:14px;border:1px solid #000;text-align:center;line-height:12px;font-size:11px;vertical-align:middle;">${isCertified ? '✓' : ''}</span> 해당 &nbsp;&nbsp;&nbsp;
<span style="display:inline-block;width:14px;height:14px;border:1px solid #000;text-align:center;line-height:12px;font-size:11px;vertical-align:middle;">${!isCertified ? '✓' : ''}</span> 비해당
</td>
</tr>
<tr>
<td class="label">성명</td><td class="value empty">(인 또는 서명)</td>
<td class="label">직위<br>(연락처)</td><td class="value empty">(대학 작성)</td>
</tr>
</table>

</body></html>`;
}

// 미리보기 / PDF 저장 버튼 — 프로필 누락 시 입력 폼 표시
// inline=true: 첨부 서류 박스 안에 들어갈 때 사용 (외부 마진 제거)
function ConfirmationFormButton({ contract, form, profile, onProfileChange, inline = false }) {
  // 필드별 누락 여부
  const fieldStates = [
    { key: 'phone',            icon: '📞', label: '전화번호',       placeholder: '010-1234-5678',     type: 'tel',   maxLen: 13,  filled: !!profile?.phone },
    { key: 'email',            icon: '📧', label: '이메일',         placeholder: 'example@email.com', type: 'email', maxLen: 100, filled: !!profile?.email },
    { key: 'alien_reg_number', icon: '🪪', label: '외국인등록번호', placeholder: '000000-0000000',    type: 'text',  maxLen: 14,  filled: !!profile?.alien_reg_number },
  ];
  const missingFields = fieldStates.filter(f => !f.filled);
  const profileMissing = missingFields.length > 0;
  const filledCount = fieldStates.length - missingFields.length;

  const open = () => {
    const html = generateConfirmationFormHTML(contract, form, profile);
    if (!html) {
      alert('계약서 데이터를 먼저 불러와 주세요');
      return;
    }
    const w = window.open('', '_blank');
    if (!w) {
      alert('⚠️ 팝업이 차단되었습니다. 브라우저 설정을 확인해 주세요.');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const updateField = (field, value) => {
    if (field === 'alien_reg_number') {
      value = value.replace(/[^\d-]/g, '');
      const digits = value.replace(/-/g, '');
      if (digits.length > 6) value = digits.slice(0,6) + '-' + digits.slice(6,13);
      else value = digits;
    }
    onProfileChange?.({ ...profile, [field]: value });
  };

  const containerStyle = inline ? {
    background: profileMissing ? "#FEF3C7" : "#EFF6FF",
    border: `1px solid ${profileMissing ? "#FDE68A" : "#BFDBFE"}`,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
  } : {
    background: profileMissing ? "#FEF3C7" : "#EFF6FF",
    border: `1.5px solid ${profileMissing ? "#FDE68A" : "#BFDBFE"}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: profileMissing ? 10 : 0 }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%",
          background: profileMissing ? "#DC2626" : "#1A56F0", color: "#FFF",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800,
        }}>{profileMissing ? '!' : '⚡'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: profileMissing ? "#92400E" : "#1E40AF" }}>
            📋 시간제취업확인서
            <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: profileMissing ? "#DC2626" : "#059669" }}>
              필수
            </span>
          </div>
          <div style={{ fontSize: 10, color: profileMissing ? "#92400E" : "#3B82F6", marginTop: 1 }}>
            {profileMissing
              ? <>
                  ⚠️ {filledCount > 0 && <span>✓ 회원정보에서 {filledCount}개 자동 입력됨 · </span>}
                  다음 정보 입력 필요: <strong>{missingFields.map(f => f.label).join(', ')}</strong>
                </>
              : '⚡ 자동 생성 완료 · 유학생담당자 확인란만 학교에서 작성'}
          </div>
        </div>
        {!profileMissing && (
          <button
            type="button"
            onClick={open}
            style={{
              padding: "6px 10px",
              background: "#FFF",
              color: "#1E40AF",
              border: "1.5px solid #BFDBFE",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            📄 미리보기
          </button>
        )}
      </div>

      {/* 프로필 입력 폼 — 필드별로 회원정보 불러옴 또는 입력 필요 표시 */}
      {profileMissing && (
        <div style={{ display: "grid", gap: 8 }}>
          {fieldStates.map(f => (
            <label key={f.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, flex: 1,
                  color: f.filled ? "#065F46" : "#92400E",
                }}>
                  {f.icon} {f.label} <span style={{ color: "#DC2626" }}>*</span>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 999,
                  color: f.filled ? "#059669" : "#B45309",
                  background: f.filled ? "#ECFDF5" : "#FEF3C7",
                }}>
                  {f.filled ? '✓ 회원정보에서 불러옴' : '입력 필요'}
                </span>
              </div>
              <input
                type={f.type}
                value={profile?.[f.key] || ''}
                onChange={(e) => updateField(f.key, e.target.value)}
                placeholder={f.placeholder}
                maxLength={f.maxLen}
                style={{
                  width: '100%', padding: '8px 10px', boxSizing: 'border-box',
                  border: `1px solid ${f.filled ? '#A7F3D0' : '#FDE68A'}`,
                  borderRadius: 5,
                  fontSize: 12, fontFamily: 'inherit',
                  background: f.filled ? '#F0FDF4' : '#FFF',
                  letterSpacing: f.key === 'alien_reg_number' ? '0.5px' : 'normal',
                }}
              />
            </label>
          ))}
          <div style={{ fontSize: 9, color: "#92400E", lineHeight: 1.6 }}>
            🔒 입력된 정보는 본인만 접근 가능하며, 시간제취업확인서 자동 작성에만 사용됩니다.
          </div>
        </div>
      )}
    </div>
  );
}

function AutoAnalysisDisplay({ form, contract }) {
  const pat = analyzeWorkPattern(contract);
  if (!pat) {
    return <div style={{ color: "#9CA3AF", fontSize: 12 }}>계약서를 불러온 후 자동 분석됩니다</div>;
  }

  const isD2Degree = form.visa === 'D-2' && form.course !== 'lang';
  const TOPIK_MIN = {lang:2, as:3, ug12:3, ug34:4, grad:4};
  const topikMin = TOPIK_MIN[form.course] || 3;
  const topikOk = form.topik >= topikMin;
  const unlimitedEligible = isD2Degree && topikOk;

  const BASE = {lang:20, as:20, ug12:20, ug34:20, grad:30};
  const base = BASE[form.course] || 20;
  let weekdayLimit = topikOk ? base : Math.floor(base/2);
  if (topikOk && (form.univ?.certified || form.topik >= 5)) weekdayLimit += 5;

  const weekdayOver = pat.weekdayHoursPerWeek > weekdayLimit;
  const weekendHours = pat.weekendHoursPerWeek;
  const weekendOver = !unlimitedEligible && weekendHours > weekdayLimit;
  const vacationHours = pat.hoursVacationAvg || 0;
  const vacOver = !unlimitedEligible && vacationHours > weekdayLimit;

  return (
    <div style={{ fontSize: 12, lineHeight: 1.7 }}>
      {pat.weekdayDays.length > 0 && (
        <div style={{ marginTop: 6, padding: "8px 10px",
                      background: weekdayOver ? "#FEF2F2" : "#EFF6FF",
                      border: `1px solid ${weekdayOver ? "#FECACA" : "#DBEAFE"}`,
                      borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: weekdayOver ? "#DC2626" : "#1E40AF" }}>
            {weekdayOver ? '❌' : '✅'} 학기 중 평일 ({pat.weekdayDays.join('·')})
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            {Math.round(pat.weekdayHoursPerWeek*10)/10}h/주 · 한도 {weekdayLimit}h{' '}
            {weekdayOver
              ? <strong style={{ color: "#DC2626" }}>초과</strong>
              : <strong style={{ color: "#059669" }}>이내</strong>}
          </div>
        </div>
      )}

      {pat.weekendDays.length > 0 && (
        <div style={{ marginTop: 6, padding: "8px 10px",
                      background: unlimitedEligible ? "#ECFDF5" : weekendOver ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${unlimitedEligible ? "#A7F3D0" : weekendOver ? "#FECACA" : "#FCD34D"}`,
                      borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: unlimitedEligible ? "#059669" : weekendOver ? "#DC2626" : "#92400E" }}>
            {unlimitedEligible ? '✅' : weekendOver ? '❌' : '⚠️'} 학기 중 주말·공휴일 ({pat.weekendDays.join('·')})
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            {Math.round(weekendHours*10)/10}h/주 ·{' '}
            {unlimitedEligible
              ? <strong style={{ color: "#059669" }}>무제한 ✓</strong>
              : weekendOver
                ? <strong style={{ color: "#DC2626" }}>한도 {weekdayLimit}h 초과</strong>
                : <span>한도 {weekdayLimit}h 이내</span>}
          </div>
        </div>
      )}

      {pat.stats.vacation > 0 && (
        <div style={{ marginTop: 6, padding: "8px 10px",
                      background: unlimitedEligible ? "#ECFDF5" : vacOver ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${unlimitedEligible ? "#A7F3D0" : vacOver ? "#FECACA" : "#FCD34D"}`,
                      borderRadius: 6 }}>
          <div style={{ fontWeight: 700, color: unlimitedEligible ? "#059669" : vacOver ? "#DC2626" : "#92400E" }}>
            {unlimitedEligible ? '✅' : vacOver ? '❌' : '⚠️'} 방학 기간 (계약 내 {pat.stats.vacation}일)
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
            {Math.round(vacationHours*10)/10}h/주 ·{' '}
            {unlimitedEligible
              ? <strong style={{ color: "#059669" }}>무제한 ✓</strong>
              : vacOver
                ? <strong style={{ color: "#DC2626" }}>한도 {weekdayLimit}h 초과</strong>
                : <span>한도 {weekdayLimit}h 이내</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════
function PartWorkApplyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState(0);
  const [user, setUser] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [loadingContract, setLoadingContract] = useState(true);
  const [contractError, setContractError] = useState(null);
  const [availableContracts, setAvailableContracts] = useState([]);

  // 계약서 정보 (Supabase에서 로드 or 기본값)
  const [contract, setContract] = useState({
    id: null,
    employer_name: "",
    employer_business_no: "",
    position: "",
    weekly_hours: 0,
    work_days: "",
    pay_amount: 0,
    contract_start: "",
    contract_end: "",
    contract_pdf_url: null,
    is_loaded_from_db: false,
  });

  // 업로드된 파일 상태 (6종 서류)
  const [uploads, setUploads] = useState({
    contract: null,    // 표준근로계약서 (계약서 챗봇 자동 첨부 가능)
    enrollment: null,  // 재학증명서 (필수)
    grade: null,       // 성적증명서 (선택)
    topik_cert: null,  // 한국어능력증명서 (선택)
    passport: null,    // 여권 사본 (필수)
    arc: null,         // 외국인등록증 (필수)
  });

  // 폼 상태
  const [form, setForm] = useState({
    visa: "D-2",
    arrivalDate: "",
    course: "ug34",
    univ: null,
    topik: 0,
    season: "semester", // (자동 계산되지만 DB 호환을 위해 form 상태에 유지)
    weeklyHours: 20,
  });

  // 사용자 프로필 (시간제취업확인서 자동 채움용)
  const [profile, setProfile] = useState({
    phone: '',
    email: '',
    alien_reg_number: '',
    passport_number: '',
    nationality: '',
  });

  // 프로필 변경 시 자동 저장 (디바운스)
  const profileSaveTimer = useRef(null);
  const handleProfileChange = (next) => {
    setProfile(next);
    clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            phone: next.phone || null,
            email: next.email || null,
            alien_reg_number: next.alien_reg_number || null,
            passport_number: next.passport_number || null,
            nationality: next.nationality || null,
          }, { onConflict: 'id' });
      } catch(e) { console.warn('[profile save]', e); }
    }, 800);
  };

  // 계약서 로드 + 유저 프로필 로드
  useEffect(() => {
    const contractIdParam = searchParams.get("contract_id");

    getCurrentUser().then(async (u) => {
      setUser(u);

      if (!u) {
        setLoadingContract(false);
        // URL 파라미터 기반 fallback (데모 용)
        setContract({
          id: null,
          employer_name: searchParams.get("employer") || "GS25 홍대입구역점",
          position: searchParams.get("position") || "야간 편의점 아르바이트",
          weekly_hours: Number(searchParams.get("hours")) || 20,
          work_days: searchParams.get("days") || "월·화·수·목·금",
          pay_amount: Number(searchParams.get("pay")) || 10030,
          contract_start: searchParams.get("start") || "2026-05-01",
          contract_end: searchParams.get("end") || "2026-07-31",
          is_loaded_from_db: false,
        });
        return;
      }

      // 프로필에서 기본 정보 자동 채움
      const p = await getProfile(u.id);
      if (p?.visa) setForm((f) => ({ ...f, visa: p.visa }));
      if (p?.organization) {
        const uni = KOREAN_UNIVERSITIES.find((x) => x.name === p.organization);
        if (uni) setForm((f) => ({ ...f, univ: uni }));
      }
      // 시간제취업확인서 자동 채움용 프로필 정보 로드
      if (p) {
        setProfile({
          phone:            p.phone            || '',
          email:            p.email            || u.email || '',
          alien_reg_number: p.alien_reg_number || '',
          passport_number:  p.passport_number  || '',
          nationality:      p.nationality      || '',
        });
      }

      // 계약서 ID가 URL에 있으면 → 해당 계약서만 로드
      if (contractIdParam && supabase) {
        try {
          const { data: c, error } = await supabase
            .from("contracts")
            .select("*")
            .eq("id", contractIdParam)
            .eq("worker_id", u.id)
            .single();

          if (error || !c) {
            setContractError("해당 계약서를 찾을 수 없습니다.");
            setLoadingContract(false);
            return;
          }

          if (!c.worker_signed || !c.employer_signed) {
            setContractError("아직 양측 서명이 완료되지 않은 계약서입니다.");
            setLoadingContract(false);
            return;
          }

          setContract({
            id: c.id,
            employer_name: c.company_name || c.employer_name,
            employer_business_no: c.business_number || "",
            position: c.job_description || c.job_type || "아르바이트",
            weekly_hours: calculateWeeklyHours(c),
            work_days: Array.isArray(c.work_days) ? c.work_days.join("·") : (c.work_days || ""),
            pay_amount: c.pay_amount || 0,
            contract_start: c.contract_start || "",
            contract_end: c.contract_end || "",
            contract_pdf_url: c.pdf_url || null,
            is_loaded_from_db: true,
          });
          setForm((f) => ({ ...f, weeklyHours: calculateWeeklyHours(c) }));
          setLoadingContract(false);
          return;
        } catch (e) {
          console.error("[partwork] contract load error:", e);
          setContractError("계약서 로드 실패: " + e.message);
          setLoadingContract(false);
          return;
        }
      }

      // contract_id 없으면 → 본인의 서명 완료 계약서 목록 조회
      if (supabase) {
        try {
          const { data: list } = await supabase
            .from("contracts")
            .select("id, company_name, employer_name, job_description, job_type, work_days, work_start, work_end, pay_amount, contract_start, contract_end, pdf_url, created_at, business_number")
            .eq("worker_id", u.id)
            .eq("worker_signed", true)
            .eq("employer_signed", true)
            .eq("status", "completed")
            .order("created_at", { ascending: false });

          if (list && list.length > 0) {
            setAvailableContracts(list);
            // 가장 최근 계약서 자동 선택
            const latest = list[0];
            setContract({
              id: latest.id,
              employer_name: latest.company_name || latest.employer_name,
              employer_business_no: latest.business_number || "",
              position: latest.job_description || latest.job_type || "아르바이트",
              weekly_hours: calculateWeeklyHours(latest),
              work_days: Array.isArray(latest.work_days) ? latest.work_days.join("·") : (latest.work_days || ""),
              pay_amount: latest.pay_amount || 0,
              contract_start: latest.contract_start || "",
              contract_end: latest.contract_end || "",
              contract_pdf_url: latest.pdf_url || null,
              is_loaded_from_db: true,
            });
            setForm((f) => ({ ...f, weeklyHours: calculateWeeklyHours(latest) }));
          } else {
            // 계약서 없음 → 데모 값
            setContract({
              id: null,
              employer_name: searchParams.get("employer") || "GS25 홍대입구역점",
              position: searchParams.get("position") || "야간 편의점 아르바이트",
              weekly_hours: Number(searchParams.get("hours")) || 20,
              work_days: searchParams.get("days") || "월·화·수·목·금",
              pay_amount: Number(searchParams.get("pay")) || 10030,
              contract_start: searchParams.get("start") || "2026-05-01",
              contract_end: searchParams.get("end") || "2026-07-31",
              is_loaded_from_db: false,
            });
          }
        } catch (e) {
          console.error("[partwork] contracts list error:", e);
        }
      }

      setLoadingContract(false);
    });
  }, [searchParams]);

  // 계약서 변경 (목록 중 다른 것 선택 시)
  const selectContract = (c) => {
    setContract({
      id: c.id,
      employer_name: c.company_name || c.employer_name,
      employer_business_no: c.business_number || "",
      position: c.job_description || c.job_type || "아르바이트",
      weekly_hours: calculateWeeklyHours(c),
      work_days: Array.isArray(c.work_days) ? c.work_days.join("·") : (c.work_days || ""),
      pay_amount: c.pay_amount || 0,
      contract_start: c.contract_start || "",
      contract_end: c.contract_end || "",
      contract_pdf_url: c.pdf_url || null,
      is_loaded_from_db: true,
    });
    setForm((f) => ({ ...f, weeklyHours: calculateWeeklyHours(c) }));
  };

  // 허용 시간 계산 (실시간)
  const validation = useMemo(() => computeValidation(form, contract), [form, contract]);

  // 스크린 전환 함수
  const goScreen = (n) => {
    setScreen(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{
      background: "#F5F5F0",
      minHeight: "100vh",
      maxWidth: 480,
      margin: "0 auto",
      fontFamily: "'Noto Sans KR', 'Pretendard', sans-serif",
      color: "#111",
    }}>
      {/* 상단바 */}
      <TopBar screen={screen} onBack={() => screen > 0 ? goScreen(screen - 1) : router.back()} />

      {/* 스텝 트랙 */}
      <StepTrack screen={screen} />

      {/* 화면별 렌더 (3단계: 계약/서류 → 자격 → 최종) */}
      {screen === 0 && (
        <Screen0
          contract={contract}
          loading={loadingContract}
          error={contractError}
          availableContracts={availableContracts}
          onSelectContract={selectContract}
          uploads={uploads}
          setUploads={setUploads}
          onNext={() => goScreen(1)}
        />
      )}
      {screen === 1 && (
        <Screen1
          form={form}
          setForm={setForm}
          validation={validation}
          onNext={() => goScreen(2)}
        />
      )}
      {screen === 2 && (
        <Screen3
          form={form}
          contract={contract}
          validation={validation}
          uploads={uploads}
          profile={profile}
          onProfileChange={handleProfileChange}
          onBack={() => goScreen(1)}
          onSubmit={(data) => {
            setSubmitResult(data);
            goScreen(3);
          }}
        />
      )}
      {screen === 3 && <Screen4 result={submitResult} />}
    </div>
  );
}

// ═══════════════════════════════════════════════
// 상단바 + 스텝 트랙
// ═══════════════════════════════════════════════
function TopBar({ screen, onBack }) {
  const titles = ["계약 · 서류", "자격 입력", "최종 제출", "완료"];
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      background: "rgba(245, 245, 240, 0.96)",
      backdropFilter: "blur(14px)",
      borderBottom: "1px solid #E4E2DE",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 16px",
      height: 52,
    }}>
      <button onClick={onBack} style={{
        fontSize: 22,
        cursor: "pointer",
        padding: 4,
        lineHeight: 1,
        background: "none",
        border: "none",
        color: "#111",
      }}>
        ‹
      </button>
      <div style={{ fontSize: 14, fontWeight: 800, flex: 1, textAlign: "center" }}>
        시간제취업 신청
      </div>
      <div style={{ fontSize: 11, color: "#888", whiteSpace: "nowrap" }}>
        {titles[screen]}
      </div>
    </div>
  );
}

function StepTrack({ screen }) {
  const steps = [
    { label: "계약 · 서류", idx: 0 },
    { label: "자격 입력", idx: 1 },
    { label: "최종 제출", idx: 2 },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 20px 8px" }}>
      {steps.map((s, i) => {
        const done = screen > s.idx;
        const active = screen === s.idx;
        return (
          <div key={s.idx} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            flex: 1,
            position: "relative",
          }}>
            {i < steps.length - 1 && (
              <div style={{
                position: "absolute",
                top: 13,
                left: "calc(50% + 13px)",
                right: "calc(-50% + 13px)",
                height: 2,
                background: done || active ? "#00B37E" : "#E4E2DE",
              }} />
            )}
            <div style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              border: `2px solid ${done ? "#00B37E" : active ? "#111" : "#E4E2DE"}`,
              background: done ? "#00B37E" : active ? "#111" : "#FFF",
              color: done || active ? "#FFF" : "#888",
              position: "relative",
              zIndex: 1,
              transition: "0.25s",
              boxShadow: active ? "0 0 0 4px rgba(17,17,17,0.1)" : "none",
            }}>
              {done ? "✓" : s.idx === 0 ? "✓" : s.idx}
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: done ? 700 : active ? 900 : 700,
              color: done ? "#00B37E" : active ? "#111" : "#888",
              textAlign: "center",
            }}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Screen 0: 계약 연동 확인
// ═══════════════════════════════════════════════
function Screen0({ contract, loading, error, availableContracts, onSelectContract, uploads, setUploads, onNext }) {
  const [showContractPicker, setShowContractPicker] = useState(false);

  // 필수 서류: 표준근로계약서(자동 첨부 또는 업로드) + 5종 (재학·성적·TOPIK·여권·외국인등록증)
  const hasContract = !!contract.contract_pdf_url || !!uploads.contract;
  const canNext = contract.id
    && hasContract
    && uploads.enrollment
    && uploads.grade
    && uploads.topik_cert
    && uploads.passport
    && uploads.arc;

  if (loading) {
    return (
      <div style={{ padding: "60px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, color: "#444" }}>계약서 정보 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{error}</div>
        <Link href="/my-contracts" style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 20px",
          background: "#111",
          color: "#FFF",
          textDecoration: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 700,
        }}>
          내 계약서 보기
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: "inline-block",
          padding: "4px 10px",
          background: contract.is_loaded_from_db ? "#D1FAE5" : "#FEE500",
          color: contract.is_loaded_from_db ? "#065F46" : "#3C1E1E",
          fontSize: 11,
          fontWeight: 800,
          borderRadius: 6,
          marginBottom: 12,
        }}>
          {contract.is_loaded_from_db ? "✓ 표준근로계약서 연동" : "📄 데모 데이터"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.3, marginBottom: 6 }}>
          근무처 정보<br />자동 완성됐어요
        </div>
        <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>
          {contract.is_loaded_from_db
            ? "서명 완료된 계약서에서 불러온 정보입니다.\n본인 확인 서류 업로드 후 다음으로 진행하세요."
            : "계약서가 없는 경우 샘플 값으로 표시됩니다.\n실제 신청에는 서명 완료된 계약서가 필요합니다."}
        </div>
      </div>

      {/* 계약서 선택기 (여러 개일 때만) */}
      {availableContracts.length > 1 && (
        <div style={{
          background: "#FFF",
          border: "1px solid #E4E2DE",
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
        }}>
          <button
            onClick={() => setShowContractPicker(!showContractPicker)}
            style={{
              width: "100%",
              padding: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>
              📋 다른 계약서 선택 ({availableContracts.length}건)
            </span>
            <span style={{ fontSize: 14, color: "#888" }}>
              {showContractPicker ? "▲" : "▼"}
            </span>
          </button>

          {showContractPicker && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {availableContracts.map((c) => {
                const isSelected = c.id === contract.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectContract(c);
                      setShowContractPicker(false);
                    }}
                    style={{
                      padding: "10px 12px",
                      background: isSelected ? "#DBEAFE" : "#F5F5F0",
                      border: `1.5px solid ${isSelected ? "#1A56F0" : "#E4E2DE"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isSelected ? "#1E40AF" : "#111",
                    }}>
                      {isSelected && "✓ "}{c.company_name || c.employer_name}
                    </div>
                    <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
                      {c.contract_start} ~ {c.contract_end}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 근무처 카드 */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}>
          EMPLOYER · 근무처
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
          {contract.employer_name}
        </div>
        {contract.position && (
          <div style={{ fontSize: 13, color: "#444" }}>
            {contract.position}
          </div>
        )}
        {contract.employer_business_no && (
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
            사업자번호: {contract.employer_business_no}
          </div>
        )}
      </div>

      {/* 근무 조건 카드 */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}>
          CONDITIONS · 근무 조건
        </div>
        <InfoRow label="주당 근무" value={`${contract.weekly_hours}시간`} />
        {contract.work_days && <InfoRow label="근무 요일" value={contract.work_days} />}
        <InfoRow label="시급" value={`₩${Number(contract.pay_amount).toLocaleString()}`} />
        <InfoRow label="계약 기간" value={`${contract.contract_start} ~ ${contract.contract_end}`} />
      </div>

      {/* 계약서 PDF 링크 */}
      {contract.contract_pdf_url && (
        <a
          href={contract.contract_pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            width: "100%",
            padding: "14px 16px",
            background: "#FEE500",
            border: "2px solid #3C1E1E",
            borderRadius: 12,
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 22 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#3C1E1E" }}>
              표준근로계약서 PDF (서명 완료)
            </div>
            <div style={{ fontSize: 11, color: "#444" }}>
              탭하면 계약서 내용을 확인할 수 있어요
            </div>
          </div>
          <span style={{ fontSize: 18, color: "#3C1E1E" }}>→</span>
        </a>
      )}

      {/* 본인 확인 서류 업로드 */}
      <div style={{ marginTop: 24, marginBottom: 14 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}>
          REQUIRED DOCUMENTS · 본인 확인 서류
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 4 }}>
          첨부 서류 6종
        </div>
        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
          사진 또는 PDF로 업로드 · 카메라 촬영도 가능합니다
        </div>
      </div>

      {/* 1. 표준근로계약서 — 계약서 챗봇 자동 첨부 시 별도 처리 */}
      {!contract.contract_pdf_url && (
        <FileUpload
          docType="contract"
          label="표준근로계약서"
          subtitle="알바계약 앱 PDF 또는 직접 업로드"
          icon="📄"
          required
          onChange={(f) => setUploads((u) => ({ ...u, contract: f }))}
          initialFile={uploads.contract}
        />
      )}
      {contract.contract_pdf_url && (
        <a
          href={contract.contract_pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "13px 14px", marginBottom: 10,
            background: "#ECFDF5", border: "1.5px solid #A7F3D0",
            borderRadius: 10, textDecoration: "none", color: "#065F46",
          }}>
          <span style={{ fontSize: 22 }}>📄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>표준근로계약서</div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
              PDF 자동 첨부 완료 · 탭하면 미리보기
            </div>
          </div>
          <span style={{ fontSize: 18 }}>›</span>
        </a>
      )}

      {/* 2. 재학증명서 (필수) */}
      <FileUpload
        docType="enrollment"
        label="재학증명서"
        icon="🎓"
        required
        onChange={(f) => setUploads((u) => ({ ...u, enrollment: f }))}
        initialFile={uploads.enrollment}
      />

      {/* 3. 성적증명서 (필수) */}
      <FileUpload
        docType="grade"
        label="성적증명서"
        icon="📊"
        required
        onChange={(f) => setUploads((u) => ({ ...u, grade: f }))}
        initialFile={uploads.grade}
      />

      {/* 4. 한국어능력증명서 (필수) */}
      <FileUpload
        docType="topik_cert"
        label="한국어능력증명서 (TOPIK)"
        icon="🇰🇷"
        required
        onChange={(f) => setUploads((u) => ({ ...u, topik_cert: f }))}
        initialFile={uploads.topik_cert}
      />

      {/* 5. 여권 사본 (필수) */}
      <FileUpload
        docType="passport"
        label="여권 사본"
        subtitle="인적사항 페이지 (Personal page)"
        icon="🛂"
        required
        onChange={(f) => setUploads((u) => ({ ...u, passport: f }))}
        initialFile={uploads.passport}
      />

      {/* 6. 외국인등록증 (필수) */}
      <FileUpload
        docType="arc"
        label="외국인등록증 (ARC)"
        subtitle="앞면·뒷면 모두 (양면 권장)"
        icon="🪪"
        required
        onChange={(f) => setUploads((u) => ({ ...u, arc: f }))}
        initialFile={uploads.arc}
      />

      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: "100%",
          padding: 15,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 800,
          border: "none",
          cursor: canNext ? "pointer" : "not-allowed",
          background: canNext ? "#111" : "#E4E2DE",
          color: canNext ? "#FFF" : "#888",
          fontFamily: "inherit",
          marginTop: 16,
        }}
      >
        자격 요건 입력하기 →
      </button>

      {!canNext && (
        <div style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 11,
          color: "#E03030",
        }}>
          ⚠️ {(() => {
            const missing = [];
            if (!hasContract) missing.push("표준근로계약서");
            if (!uploads.enrollment) missing.push("재학증명서");
            if (!uploads.grade) missing.push("성적증명서");
            if (!uploads.topik_cert) missing.push("한국어능력증명서");
            if (!uploads.passport) missing.push("여권");
            if (!uploads.arc) missing.push("외국인등록증");
            return `미제출: ${missing.join(", ")} (필수 서류)`;
          })()}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: "1px solid #F5F5F0",
    }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Screen 1: 자격 요건 입력
// ═══════════════════════════════════════════════
function Screen1({ form, setForm, validation, onNext }) {
  const needArrival = form.visa === "D-4";
  const arrivalValid = !needArrival || (form.arrivalDate && daysSince(form.arrivalDate) >= 180);
  // 기본 조건 + 자격 검증 통과 시에만 다음
  const canNext = form.univ && arrivalValid && validation.allPass;

  return (
    <div style={{ padding: "20px 16px 24px" }}>
      <SectionHeader
        tag="STEP 1"
        title="자격 요건 입력"
      />

      {/* 비자 */}
      <Card icon="🛂" iconColor="#DBEAFE" title="비자 정보">
        <FieldLabel>비자 종류 <Req /></FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: needArrival ? 14 : 0 }}>
          <VisaCard
            active={form.visa === "D-2"}
            type="D-2"
            name=""
            badge="학위과정"
            badgeColor="#1E40AF"
            badgeBg="#DBEAFE"
            onClick={() => setForm({ ...form, visa: "D-2" })}
          />
          <VisaCard
            active={form.visa === "D-4"}
            type="D-4"
            name=""
            badge="어학연수"
            badgeColor="#9A3412"
            badgeBg="#FFEDD5"
            onClick={() => setForm({ ...form, visa: "D-4", course: "lang" })}
          />
        </div>

        {needArrival && (
          <div>
            <FieldLabel>
              입국일 (또는 자격변경일) <Req />
              {form.arrivalDate && (
                <span style={{
                  marginLeft: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: arrivalValid ? "#00B37E" : "#E03030",
                }}>
                  D+{daysSince(form.arrivalDate)}일
                </span>
              )}
            </FieldLabel>
            <input
              type="date"
              value={form.arrivalDate}
              onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              style={dateInputStyle}
            />
            <div style={{
              fontSize: 10,
              color: arrivalValid ? "#00B37E" : "#E03030",
              marginTop: 6,
              lineHeight: 1.5,
            }}>
              {form.arrivalDate
                ? arrivalValid
                  ? "✓ 6개월 경과 — 시간제취업 신청 가능"
                  : `❗ 입국 후 6개월이 경과해야 합니다 (${180 - daysSince(form.arrivalDate)}일 남음)`
                : "D-4는 입국일로부터 6개월 경과 후부터 신청 가능합니다"
              }
            </div>
          </div>
        )}
      </Card>

      {/* 재학 */}
      <Card icon="🎓" iconColor="#FEF3C7" title="재학 정보">
        <FieldLabel>재학 과정 <Req /></FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {Object.entries(COURSE_LABELS).map(([key, label]) => {
            // D-4는 어학연수만
            const disabled = form.visa === "D-4" && key !== "lang";
            // D-2는 어학연수 제외
            const disabled2 = form.visa === "D-2" && key === "lang";
            if (disabled || disabled2) return null;
            return (
              <Chip
                key={key}
                active={form.course === key}
                onClick={() => setForm({ ...form, course: key })}
              >
                {label}
              </Chip>
            );
          })}
        </div>

        <FieldLabel>재학 대학 <Req /></FieldLabel>
        <UniversitySearch
          value={form.univ}
          onSelect={(uni) => setForm({ ...form, univ: uni })}
        />
      </Card>

      {/* TOPIK */}
      <Card icon="🇰🇷" iconColor="#FFEDD5" title="한국어 능력 (TOPIK)">
        <FieldLabel>TOPIK 급수 <Req /></FieldLabel>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 6,
        }}>
          {[0, 1, 2, 3, 4, 5].map((lv) => (
            <button
              key={lv}
              onClick={() => setForm({ ...form, topik: lv })}
              style={{
                padding: "10px 4px",
                borderRadius: 8,
                border: `1.5px solid ${form.topik === lv ? "#111" : "#E4E2DE"}`,
                background: form.topik === lv ? "#111" : "#FFF",
                color: form.topik === lv ? "#FFF" : "#111",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {lv === 0 ? "없음" : `${lv}급`}
            </button>
          ))}
        </div>
      </Card>

      {/* 근무 패턴 자동 분석 (계약서 + 한국 공휴일·학사일정 기반) */}
      <Card icon="📅" iconColor="#D1FAE5" title="근무 패턴 자동 분석">
        <AutoAnalysisDisplay form={form} contract={contract} />
      </Card>

      {/* 실시간 게이지 */}
      <GaugeCard validation={validation} contract={contract} form={form} />

      {/* 다음 버튼 */}
      <button
        onClick={onNext}
        disabled={!canNext}
        style={{
          width: "100%",
          padding: 15,
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 800,
          border: "none",
          cursor: canNext ? "pointer" : "not-allowed",
          background: canNext ? "#111" : "#E4E2DE",
          color: canNext ? "#FFF" : "#888",
          fontFamily: "inherit",
          marginTop: 16,
        }}
      >
        최종 확인으로 →
      </button>

      {!canNext && (
        <div style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 11,
          color: "#E03030",
          lineHeight: 1.5,
        }}>
          {!form.univ ? "⚠️ 재학 대학을 선택해 주세요" :
           !arrivalValid ? "⚠️ D-4는 입국 후 6개월 경과해야 합니다" :
           !validation.allPass ? "⚠️ 자격 요건을 충족하지 못했습니다. 위 항목을 확인해 주세요" :
           ""}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Screen 2 (최종 확인 + 학생 서명)
// 이전 Screen3이었으나 검증 결과 화면 제거로 S2로 통합
// ═══════════════════════════════════════════════
function Screen3({ form, contract, validation, uploads, profile, onProfileChange, onBack, onSubmit }) {
  const [agreed, setAgreed] = useState(false);
  const [studentSignature, setStudentSignature] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const profileComplete = !!(profile?.phone && profile?.email && profile?.alien_reg_number);
  const docsComplete = !!(uploads?.enrollment && uploads?.grade && uploads?.topik_cert && uploads?.passport && uploads?.arc);
  const canSubmit = agreed && studentSignature && profileComplete && docsComplete && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert("로그인이 필요합니다.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/partwork/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          visa: form.visa,
          arrival_date: form.arrivalDate || null,
          course: form.course,
          university_name: form.univ?.name,
          university_certified: form.univ?.certified,
          topik_level: form.topik,
          season: getAcademicPeriod(new Date()), // 오늘 기준 자동 판정
          work_pattern: analyzeWorkPattern(contract), // 자동 분석 결과 함께 저장
          contract_id: contract.id,
          contract_pdf_url: contract.contract_pdf_url || null, // 표준근로계약서 PDF (Supabase Storage)
          employer_name: contract.employer_name,
          employer_business_no: contract.employer_business_no,
          position: contract.position,
          work_days: contract.work_days,
          weekly_hours: contract.weekly_hours,
          hourly_pay: contract.pay_amount,
          contract_start: contract.contract_start,
          contract_end: contract.contract_end,
          student_signature: studentSignature,
          // 🆕 업로드 서류 6종 (Storage path)
          contract_file_url:    uploads?.contract?.storage_path   || null,
          contract_file_name:   uploads?.contract?.file_name      || null,
          enrollment_file_url:  uploads?.enrollment?.storage_path || null,
          enrollment_file_name: uploads?.enrollment?.file_name    || null,
          grade_file_url:       uploads?.grade?.storage_path      || null,
          grade_file_name:      uploads?.grade?.file_name         || null,
          topik_cert_file_url:  uploads?.topik_cert?.storage_path || null,
          topik_cert_file_name: uploads?.topik_cert?.file_name    || null,
          passport_file_url:    uploads?.passport?.storage_path   || null,
          passport_file_name:   uploads?.passport?.file_name      || null,
          arc_file_url:         uploads?.arc?.storage_path        || null,
          arc_file_name:        uploads?.arc?.file_name           || null,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        alert(`제출 실패: ${data.error || "알 수 없는 오류"}`);
        setSubmitting(false);
        return;
      }

      // 성공 → Screen4로 이동 (application_id 전달)
      onSubmit(data);
    } catch (err) {
      alert("제출 중 오류: " + err.message);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "20px 16px 24px" }}>
      <SectionHeader
        tag="STEP 2"
        title="최종 확인 및 제출"
        sub="국제처에 제출할 정보를 확인해 주세요"
      />

      {/* 신청 요약 */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          APPLICATION · 신청 요약
        </div>

        <InfoRow label="비자" value={form.visa} />
        <InfoRow label="재학 과정" value={COURSE_LABELS[form.course]} />
        <InfoRow label="재학 대학" value={form.univ?.name || "-"} />
        <InfoRow label="대학 인증" value={form.univ?.certified ? "✓ 인증대학" : "비인증"} />
        <InfoRow label="TOPIK" value={TOPIK_LABELS[form.topik]} />
        <InfoRow label="근무 분석" value={(() => {
          const pat = analyzeWorkPattern(contract);
          if (!pat) return "—";
          const wkd = pat.weekdayDays.length > 0 ? pat.weekdayDays.join('·') + ' 평일' : '';
          const wke = pat.weekendDays.length > 0 ? pat.weekendDays.join('·') + ' 주말' : '';
          return [wkd, wke].filter(Boolean).join(' + ') || '—';
        })()} />

        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "2px solid #F5F5F0",
        }}>
          <InfoRow label="근무처" value={contract.employer_name} />
          <InfoRow label="주당 근무" value={`${contract.weekly_hours}시간`} />
          <InfoRow label="허용 한도" value={validation.maxHours === "unlimited" ? "무제한" : `${validation.maxHours}시간`} />
        </div>
      </div>

      {/* 첨부 서류 (6종 + 시간제취업확인서 자동 생성) */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          ATTACHMENTS · 첨부 서류
        </div>

        {/* 1. 표준근로계약서 — PDF 자동 첨부 */}
        {contract.contract_pdf_url ? (
          <a
            href={contract.contract_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 8,
              marginBottom: 8,
              textDecoration: "none",
              color: "#1E40AF",
            }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "#1A56F0", color: "#FFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#1E40AF" }}>📄 표준근로계약서
                <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "#059669" }}>필수</span>
              </div>
              <div style={{ fontSize: 10, color: "#3B82F6", marginTop: 1 }}>
                ⚡ PDF 자동 첨부 완료 · 탭하면 미리보기
              </div>
            </div>
            <span style={{ fontSize: 14 }}>›</span>
          </a>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: 10,
            background: !!uploads?.contract ? "#ECFDF5" : "#FEF2F2",
            border: `1px solid ${!!uploads?.contract ? "#A7F3D0" : "#FECACA"}`,
            borderRadius: 8, marginBottom: 8,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: !!uploads?.contract ? "#059669" : "#DC2626", color: "#FFF",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800 }}>{!!uploads?.contract ? '✓' : '!'}</span>
            <div style={{ flex: 1, fontSize: 13,
              color: !!uploads?.contract ? "#065F46" : "#991B1B" }}>
              <div style={{ fontWeight: 800 }}>📄 표준근로계약서
                <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: !!uploads?.contract ? "#059669" : "#DC2626" }}>필수</span>
              </div>
              <div style={{ fontSize: 10, opacity: 0.85, marginTop: 1 }}>
                {!!uploads?.contract ? '업로드 완료' : '직접 업로드 필요'}
              </div>
            </div>
          </div>
        )}

        {/* 2. 시간제취업확인서 — 자동 생성 (프로필 필요) */}
        <ConfirmationFormButton
          contract={contract}
          form={form}
          profile={profile}
          onProfileChange={handleProfileChange}
          inline
        />

        {/* 3-7. 나머지 5종 서류 상태 요약 */}
        {[
          { key: 'enrollment', label: '재학증명서',     icon: '🎓', required: true,  uploaded: !!uploads?.enrollment },
          { key: 'grade',      label: '성적증명서',     icon: '📊', required: true,  uploaded: !!uploads?.grade },
          { key: 'topik_cert', label: '한국어능력증명서', icon: '🇰🇷', required: true,  uploaded: !!uploads?.topik_cert },
          { key: 'passport',   label: '여권 사본',      icon: '🛂', required: true,  uploaded: !!uploads?.passport },
          { key: 'arc',        label: '외국인등록증',   icon: '🪪', required: true,  uploaded: !!uploads?.arc },
        ].map(d => {
          const okState = d.uploaded;
          const errState = d.required && !d.uploaded;
          return (
            <div key={d.key} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: 10, marginTop: 6, borderRadius: 8,
              background: okState ? "#ECFDF5" : errState ? "#FEF2F2" : "#F5F5F0",
              border: `1px solid ${okState ? "#A7F3D0" : errState ? "#FECACA" : "#E4E2DE"}`,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: okState ? "#059669" : errState ? "#DC2626" : "#999",
                color: "#FFF", fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{okState ? '✓' : errState ? '!' : '−'}</span>
              <div style={{ flex: 1, fontSize: 13,
                color: okState ? "#065F46" : errState ? "#991B1B" : "#888" }}>
                <strong>{d.icon} {d.label}</strong>
                {d.required
                  ? <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: errState ? "#DC2626" : "#059669" }}>필수</span>
                  : <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: "#888" }}>선택</span>}
                <div style={{ fontSize: 10, opacity: 0.85, marginTop: 1, fontWeight: 400 }}>
                  {okState ? '업로드 완료' : errState ? '미제출 — S0에서 첨부' : '제출 안 함'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🆕 학생 본인 서명 */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#888",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}>
          SIGNATURE · 본인 서명
        </div>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 12, lineHeight: 1.6 }}>
          본인이 위 정보를 확인했으며, 허위 사실이 없음을 서명으로 확인합니다.
        </div>

        {studentSignature ? (
          <div style={{
            padding: 12,
            background: "#D1FAE5",
            border: "1.5px solid #6EE7B7",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <img
              src={studentSignature}
              alt="서명"
              style={{
                maxWidth: 140,
                maxHeight: 60,
                background: "#FFF",
                borderRadius: 4,
                padding: 4,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#065F46" }}>
                ✓ 서명 완료
              </div>
              <button
                onClick={() => setStudentSignature(null)}
                style={{
                  marginTop: 4,
                  background: "none",
                  border: "none",
                  color: "#065F46",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                다시 서명하기 →
              </button>
            </div>
          </div>
        ) : (
          <SignaturePad
            label=""
            height={160}
            minPoints={10}
            onSave={(dataUrl, meta) => {
              setStudentSignature(dataUrl);
            }}
          />
        )}
      </div>

      {/* 동의 */}
      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
      }}>
        <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: "#111", lineHeight: 1.7 }}>
            <strong>국제처 제출에 동의합니다.</strong><br />
            <span style={{ fontSize: 11, color: "#444" }}>
              • 입력한 정보는 국제처 담당자에게 전달됩니다<br />
              • 허위 정보 기재 시 불이익이 있을 수 있습니다
            </span>
          </span>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ ...btnOutStyle, flex: "0 0 auto", padding: "13px 16px", fontSize: 13 }}>
          ← 수정
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            flex: 1,
            padding: 15,
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            background: canSubmit ? "#FEE500" : "#E4E2DE",
            color: canSubmit ? "#3C1E1E" : "#888",
            fontFamily: "inherit",
          }}
        >
          {submitting ? "제출 중..." : "국제처 제출하기 →"}
        </button>
      </div>

      {!studentSignature && (
        <div style={{
          marginTop: 10,
          textAlign: "center",
          fontSize: 11,
          color: "#E03030",
        }}>
          ⚠️ 제출하려면 위에서 본인 서명을 해주세요
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Screen 4: 완료
// ═══════════════════════════════════════════════
function Screen4({ result }) {
  const appNo = result?.application_no
    || `PW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  return (
    <div style={{ padding: "60px 16px 100px", textAlign: "center" }}>
      <div style={{ fontSize: 60, marginBottom: 20 }}>🎉</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
        신청이 완료되었어요!
      </div>
      <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6, marginBottom: 28 }}>
        국제처 담당자가 24시간 이내에<br />
        확인 후 카카오톡 알림을 보내드려요.
      </div>

      <div style={{
        background: "#FFF",
        border: "1px solid #E4E2DE",
        borderRadius: 14,
        padding: 20,
        marginBottom: 24,
        display: "inline-block",
        minWidth: 260,
      }}>
        <div style={{
          fontSize: 11,
          color: "#888",
          marginBottom: 6,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}>
          접수 번호
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 900,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#111",
          letterSpacing: "0.05em",
        }}>
          {appNo}
        </div>
      </div>

      {result?.pdf_url && (
        <div style={{
          background: "#D1FAE5",
          border: "1.5px solid #6EE7B7",
          borderRadius: 10,
          padding: 14,
          marginBottom: 24,
          maxWidth: 340,
          margin: "0 auto 24px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#065F46", marginBottom: 8 }}>
            📄 시간제취업확인서 PDF 생성됨
          </div>
          <a
            href={result.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              background: "#065F46",
              color: "#FFF",
              textDecoration: "none",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            PDF 다운로드 →
          </a>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "0 auto" }}>
        <Link href="/partwork" style={{ textDecoration: "none" }}>
          <button style={{ ...btnPrimaryStyle, width: "100%" }}>
            신청 현황 보기
          </button>
        </Link>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{ ...btnOutStyle, width: "100%" }}>
            홈으로
          </button>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 공용 컴포넌트
// ═══════════════════════════════════════════════
function SectionHeader({ tag, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "inline-block",
        padding: "4px 10px",
        background: "#DBEAFE",
        color: "#1E40AF",
        fontSize: 11,
        fontWeight: 800,
        borderRadius: 6,
        marginBottom: 12,
      }}>
        {tag}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.3, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6, whiteSpace: "pre-line" }}>
        {sub.replace(/\\n/g, "\n")}
      </div>
    </div>
  );
}

function Card({ icon, iconColor, title, sub, children }) {
  return (
    <div style={{
      background: "#FFF",
      border: "1px solid #E4E2DE",
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#111" }}>
      {children}
    </div>
  );
}

function Req() {
  return <span style={{ color: "#E03030" }}>*</span>;
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        border: `1.5px solid ${active ? "#111" : "#E4E2DE"}`,
        background: active ? "#111" : "#FFF",
        color: active ? "#FFF" : "#111",
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function VisaCard({ active, type, name, badge, badgeColor, badgeBg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 12px",
        borderRadius: 10,
        border: `2px solid ${active ? "#111" : "#E4E2DE"}`,
        background: active ? "#F5F5F0" : "#FFF",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 16,
        fontWeight: 800,
        color: "#111",
      }}>
        {type}
      </div>
      <div style={{ fontSize: 12, color: "#444", marginTop: 2, marginBottom: 6 }}>
        {name}
      </div>
      <span style={{
        display: "inline-block",
        padding: "2px 7px",
        background: badgeBg,
        color: badgeColor,
        fontSize: 10,
        fontWeight: 700,
        borderRadius: 4,
      }}>
        {badge}
      </span>
    </button>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: 14,
      background: "#F5F5F0",
      borderRadius: 10,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 6, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>
        {value}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 대학 검색 UI
// ═══════════════════════════════════════════════
function UniversitySearch({ value, onSelect }) {
  const [query, setQuery] = useState(value?.name || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const results = useMemo(() => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase();
    return KOREAN_UNIVERSITIES.filter((u) =>
      u.name.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          if (!e.target.value) onSelect(null);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder="대학명 검색 (예: 연세, 고려, 한양...)"
        style={{ ...dateInputStyle, paddingRight: 36 }}
      />

      {showDropdown && results.length > 0 && (
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(100% + 2px)",
          background: "#FFF",
          border: "1.5px solid #E4E2DE",
          borderRadius: 9,
          maxHeight: 200,
          overflowY: "auto",
          zIndex: 200,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}>
          {results.map((u) => (
            <div
              key={u.name}
              onMouseDown={() => {
                onSelect(u);
                setQuery(u.name);
                setShowDropdown(false);
              }}
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid #F5F5F0",
                cursor: "pointer",
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F5F0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF")}
            >
              <span style={{ fontWeight: 600 }}>{u.name}</span>
              {u.certified ? (
                <span style={{
                  fontSize: 10,
                  color: "#00B37E",
                  fontWeight: 700,
                  background: "#D1FAE5",
                  padding: "2px 6px",
                  borderRadius: 3,
                }}>
                  ✓ 인증
                </span>
              ) : (
                <span style={{ fontSize: 10, color: "#888" }}>비인증</span>
              )}
            </div>
          ))}
        </div>
      )}

      {value && (
        <div style={{
          marginTop: 8,
          padding: 10,
          background: value.certified ? "#D1FAE5" : "#FEE2E2",
          border: `1px solid ${value.certified ? "#6EE7B7" : "#FCA5A5"}`,
          borderRadius: 8,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontWeight: 700 }}>
            {value.certified ? "✓" : "⚠️"} {value.name}
          </span>
          <span style={{
            fontSize: 10,
            color: value.certified ? "#065F46" : "#991B1B",
            fontWeight: 600,
          }}>
            {value.certified ? "교육부 인증대학" : "비인증 — 신청 제한"}
          </span>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#888", marginTop: 6 }}>
        교육부 대학기관인증 여부가 자동으로 확인돼요
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 실시간 게이지 (학기 중 평일 시간만 표시)
// ═══════════════════════════════════════════════
function GaugeCard({ validation, contract, form }) {
  // 자동 분석에서 평일 시간만 추출
  const pat = analyzeWorkPattern(contract);
  const weekdayHours = pat ? pat.weekdayHoursPerWeek : (contract.weekly_hours || 0);
  const weekendHours = pat ? pat.weekendHoursPerWeek : 0;

  const max = validation.maxHours;
  const pct = max > 0 ? Math.min(100, (weekdayHours / max) * 100) : 0;
  const overLimit = max > 0 && weekdayHours > max;

  // 무제한 자격 여부 (안내용)
  const isD2Degree = form?.visa === 'D-2' && form?.course !== 'lang';
  const TOPIK_MIN = {lang:2, as:3, ug12:3, ug34:4, grad:4};
  const topikOk = form?.topik >= (TOPIK_MIN[form?.course] || 3);
  const unlimitedEligible = isD2Degree && topikOk;

  return (
    <div style={{
      background: "#F5F5F0",
      border: "1px solid #E4E2DE",
      borderRadius: 12,
      padding: 16,
      marginTop: 14,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>
          📊 학기 중 평일 주당 시간 vs 평일 한도
        </div>
        <div>
          <span style={{ fontSize: 22, fontWeight: 900, color: overLimit ? "#E03030" : "#111" }}>
            {Math.round(weekdayHours*10)/10}
          </span>
          <span style={{ fontSize: 13, color: "#888" }}> h / </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#00B37E" }}>{max || "—"}</span>
          <span style={{ fontSize: 11, color: "#888" }}>h</span>
        </div>
      </div>

      <div style={{
        width: "100%", height: 8, background: "#E4E2DE",
        borderRadius: 4, overflow: "hidden", marginBottom: 10,
      }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: overLimit ? "#E03030" : pct > 85 ? "#F07820" : "#00B37E",
          transition: "width 0.3s",
        }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666" }}>
        <span>
          {max === 0
            ? "신청 불가 — 자격 요건 미충족"
            : overLimit
            ? `❌ 학기 중 평일 ${Math.round((weekdayHours - max)*10)/10}h 초과`
            : weekdayHours === 0 && weekendHours > 0
            ? `학기 중 평일 근무 없음`
            : `✓ 평일 한도 이내 (여유 ${Math.round((max - weekdayHours)*10)/10}h)`
          }
        </span>
        {weekendHours > 0 && unlimitedEligible && (
          <span style={{ color: "#059669", fontWeight: 700 }}>
            + 주말 {Math.round(weekendHours*10)/10}h 무제한
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 검증 로직
// ═══════════════════════════════════════════════
function computeValidation(form, contract) {
  const checks = [];
  let maxHours = 0;

  // 체크 1: 비자 유효성
  if (form.visa === "D-4") {
    const days = form.arrivalDate ? daysSince(form.arrivalDate) : 0;
    const pass = days >= 180;
    checks.push({
      title: "비자 자격",
      pass,
      detail: pass
        ? `D-4 비자 · 입국 ${days}일 경과 (6개월 요건 충족)`
        : form.arrivalDate
        ? `입국 후 ${days}일 경과 — 6개월(180일) 필요`
        : "입국일을 입력해 주세요",
    });
  } else {
    checks.push({
      title: "비자 자격",
      pass: true,
      detail: "D-2 비자 · 학위과정 재학생은 즉시 신청 가능",
    });
  }

  // 체크 2: 대학 인증
  checks.push({
    title: "대학 인증",
    pass: !!form.univ?.certified,
    detail: form.univ
      ? form.univ.certified
        ? `${form.univ.name} · 교육부 인증대학 ✓`
        : `${form.univ.name} · 비인증대학 — 시간제취업 제한`
      : "대학을 선택해 주세요",
  });

  // 체크 3: 허용 시간 계산 (자동 분석 기반)
  // 법적 규정 (출입국관리법 / 외국인체류 안내매뉴얼):
  //   - D-2 학위과정 + TOPIK 충족: 학기 중 토·일·공휴일·방학 무제한
  //   - D-4 어학연수: 모든 시간 한도 내
  //   - TOPIK 미충족: 무제한 혜택 제외, 1/2 한도 적용
  const visaLimits = LIMITS[form.visa]?.[form.course];
  const isD2Degree = form.visa === "D-2" && form.course !== "lang";
  const TOPIK_MIN_LOCAL = {lang:2, as:3, ug12:3, ug34:4, grad:4};
  const topikOkLocal = form.topik >= (TOPIK_MIN_LOCAL[form.course] || 3);
  const unlimitedEligible = isD2Degree && topikOkLocal;

  // 자동 분석 결과
  const pat = analyzeWorkPattern(contract);

  if (visaLimits) {
    // 학기 중 평일 한도 (TOPIK 미충족 시 1/2)
    maxHours = visaLimits.semester?.[form.topik] || 0;
  }

  let weekdayHours = 0, weekendHours = 0;
  if (pat) {
    weekdayHours = pat.weekdayHoursPerWeek;
    weekendHours = pat.weekendHoursPerWeek;
  } else {
    // 분석 실패 시 contract.weekly_hours 전체를 평일로 간주
    weekdayHours = contract.weekly_hours || 0;
  }

  // ── 검증 (각 기간별 분리) ──
  // 1) 평일: 항상 평일 한도와 비교
  const weekdayWithin = weekdayHours <= maxHours && maxHours > 0;
  // 2) 주말: D-2 학위 + TOPIK 충족이면 무제한, 아니면 평일 한도와 비교 (단독)
  const weekendWithin = weekendHours === 0
    || unlimitedEligible
    || (weekendHours <= maxHours && maxHours > 0);
  // 3) 방학: 동일
  const vacationHours = pat ? pat.hoursVacationAvg || 0 : 0;
  const vacationWithin = vacationHours === 0
    || unlimitedEligible
    || (vacationHours <= maxHours && maxHours > 0);

  const hoursPass = weekdayWithin && weekendWithin && vacationWithin && maxHours > 0;
  const overLimit = !weekdayWithin;  // 게이지 표시용 (평일 초과)

  let detail;
  if (maxHours === 0) {
    detail = "현재 자격으로는 시간제취업이 불가합니다 (TOPIK 급수 향상 필요)";
  } else if (!weekdayWithin) {
    detail = `학기 중 평일 한도 ${maxHours}h 초과 — 평일 ${Math.round(weekdayHours*10)/10}h (${Math.round((weekdayHours-maxHours)*10)/10}h 초과)`;
  } else if (!weekendWithin) {
    detail = `학기 중 주말·공휴일 한도 초과 — 주말 ${Math.round(weekendHours*10)/10}h (한도 ${maxHours}h)${isD2Degree ? ' · TOPIK 충족 시 무제한' : ' · D-4 한도 적용'}`;
  } else if (!vacationWithin) {
    detail = `방학 한도 초과 — 평균 ${Math.round(vacationHours*10)/10}h/주`;
  } else if (unlimitedEligible && weekendHours > 0) {
    detail = `평일 ${Math.round(weekdayHours*10)/10}h (한도 ${maxHours}h 이내) + 주말·공휴일 ${Math.round(weekendHours*10)/10}h 무제한 ✓`;
  } else if (unlimitedEligible && pat?.stats.vacation > 0) {
    detail = `학기 평일 ${Math.round(weekdayHours*10)/10}h (한도 ${maxHours}h 이내) · 방학·주말은 무제한 ✓`;
  } else if (weekdayHours === 0 && weekendHours > 0) {
    detail = `학기 평일 근무 없음 · 주말 ${Math.round(weekendHours*10)/10}h (한도 ${maxHours}h 이내)`;
  } else {
    detail = `평일 ${Math.round(weekdayHours*10)/10}h / 한도 ${maxHours}h 이내 ✓`;
  }

  checks.push({
    title: "허용 시간",
    pass: hoursPass,
    detail,
  });

  const allPass = checks.every((c) => c.pass);

  return {
    checks,
    allPass,
    maxHours,
    overLimit,
  };
}

// ═══════════════════════════════════════════════
// 유틸
// ═══════════════════════════════════════════════
function daysSince(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// 계약서에서 주당 근무 시간 계산
function calculateWeeklyHours(contract) {
  if (!contract) return 20;
  if (contract.weekly_hours) return contract.weekly_hours;

  const days = Array.isArray(contract.work_days) ? contract.work_days.length
    : (contract.work_days || "").split(/[·,·\s]+/).filter(Boolean).length;

  if (!days || !contract.work_start || !contract.work_end) return 20;

  try {
    const [sh, sm] = contract.work_start.split(":").map(Number);
    const [eh, em] = contract.work_end.split(":").map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours < 0) hours += 24; // 야간 근무
    return Math.round(days * hours);
  } catch {
    return 20;
  }
}

const dateInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 9,
  border: "1.5px solid #E4E2DE",
  background: "#FFF",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#111",
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimaryStyle = {
  flex: 1,
  padding: 15,
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
  background: "#111",
  color: "#FFF",
  fontFamily: "inherit",
};

const btnOutStyle = {
  padding: 15,
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  border: "1.5px solid #E4E2DE",
  cursor: "pointer",
  background: "#FFF",
  color: "#444",
  fontFamily: "inherit",
};

// seasonBtnStyle 제거됨 — 자동 분석 방식으로 변경되어 더 이상 필요 없음

// ═══════════════════════════════════════════════
// 한국 인증 대학 데이터 (교육부 2025년 기준 일부)
// 전체 399개 대학은 별도 파일로 분리 권장
// ═══════════════════════════════════════════════
const KOREAN_UNIVERSITIES = [
  { name: "서울대학교", certified: true },
  { name: "연세대학교", certified: true },
  { name: "고려대학교", certified: true },
  { name: "성균관대학교", certified: true },
  { name: "한양대학교", certified: true },
  { name: "중앙대학교", certified: true },
  { name: "경희대학교", certified: true },
  { name: "한국외국어대학교", certified: true },
  { name: "서강대학교", certified: true },
  { name: "이화여자대학교", certified: true },
  { name: "건국대학교", certified: true },
  { name: "동국대학교", certified: true },
  { name: "홍익대학교", certified: true },
  { name: "숭실대학교", certified: true },
  { name: "단국대학교", certified: true },
  { name: "세종대학교", certified: true },
  { name: "서울시립대학교", certified: true },
  { name: "KAIST", certified: true },
  { name: "포항공과대학교", certified: true },
  { name: "부산대학교", certified: true },
  { name: "경북대학교", certified: true },
  { name: "전남대학교", certified: true },
  { name: "충남대학교", certified: true },
  { name: "충북대학교", certified: true },
  { name: "전북대학교", certified: true },
  { name: "강원대학교", certified: true },
  { name: "제주대학교", certified: true },
  { name: "인하대학교", certified: true },
  { name: "아주대학교", certified: true },
  { name: "한국항공대학교", certified: true },
  { name: "동덕여자대학교", certified: true },
  { name: "숙명여자대학교", certified: true },
  { name: "성신여자대학교", certified: true },
  { name: "덕성여자대학교", certified: true },
  { name: "광운대학교", certified: true },
  { name: "명지대학교", certified: true },
  { name: "상명대학교", certified: true },
  { name: "가천대학교", certified: true },
  { name: "가톨릭대학교", certified: true },
  { name: "국민대학교", certified: true },
  { name: "경기대학교", certified: true },
  { name: "수원대학교", certified: true },
  { name: "한성대학교", certified: true },
  { name: "삼육대학교", certified: true },
  { name: "한국체육대학교", certified: true },
  { name: "백석대학교", certified: true },
  { name: "호서대학교", certified: true },
  { name: "건양대학교", certified: true },
  { name: "대전대학교", certified: true },
  { name: "우송대학교", certified: true },
  { name: "청주대학교", certified: true },
  // 비인증 예시
  { name: "한국해양대학교", certified: false },
  { name: "한려대학교", certified: false },
  { name: "한국국제대학교", certified: false },
];


export default function PartWorkApplyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: "center" }}>⏳ 로딩...</div>}>
      <PartWorkApplyContent />
    </Suspense>
  );
}
