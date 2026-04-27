"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";

/**
 * /immigration/[id] — 출입국 통합신청서 자동 작성 페이지
 *
 * 흐름:
 * 1. 시간제취업 신청서가 'approved' 상태가 되면 통합신청서 초안 자동 생성 (DB 트리거)
 * 2. 학생이 이 페이지에 진입하면 자동 채워진 정보 + 누락 정보 입력 폼 표시
 * 3. 모든 필수 필드 입력 후 '신청서 PDF 생성' 클릭
 * 4. 자동 생성된 PDF를 출력해서 출입국·외국인청에 직접 제출
 */
const APPLICATION_TYPES = [
  { value: 'permit_other_activity',          label_ko: '체류자격 외 활동허가', label_en: 'Engage in Activities Not Covered by the Status' },
  { value: 'foreign_resident_registration',  label_ko: '외국인 등록',          label_en: 'Foreign Resident Registration' },
  { value: 'reissue_card',                   label_ko: '등록증 재발급',         label_en: 'Reissuance of Registration Card' },
  { value: 'change_workplace',               label_ko: '근무처 변경·추가허가/신고', label_en: 'Change or Addition of Workplace' },
  { value: 'extend_period',                  label_ko: '체류기간 연장허가',     label_en: 'Extension of Sojourn Period' },
  { value: 'reentry_permit',                 label_ko: '재입국허가',            label_en: 'Reentry Permit' },
  { value: 'change_status',                  label_ko: '체류자격 변경허가',     label_en: 'Alteration of Status of Sojourn' },
  { value: 'grant_status',                   label_ko: '체류자격 부여',         label_en: 'Granting Status of Sojourn' },
  { value: 'alteration_residence',           label_ko: '체류지 변경신고',       label_en: 'Change of Residence' },
  { value: 'register_change',                label_ko: '등록사항 변경신고',      label_en: 'Change of Information' },
];

export default function ImmigrationApplicationPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params?.id;

  const [user, setUser] = useState(null);
  const [imm, setImm] = useState(null);   // immigration_applications 레코드
  const [partwork, setPartwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);

  useEffect(() => {
    if (!appId) return;
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.push('/login?redirect=/immigration/' + appId); return; }
      setUser(u);

      // 통합신청서 로드
      const { data: immData, error } = await supabase
        .from('immigration_applications')
        .select('*')
        .eq('id', appId)
        .eq('user_id', u.id)
        .single();

      if (error || !immData) {
        alert('통합신청서를 찾을 수 없습니다');
        router.push('/my/applications');
        return;
      }
      setImm(immData);

      // 연관된 시간제취업 신청서 로드
      if (immData.partwork_application_id) {
        const { data: pw } = await supabase
          .from('partwork_applications')
          .select('*')
          .eq('id', immData.partwork_application_id)
          .single();
        setPartwork(pw);
      }

      setLoading(false);
    })();
  }, [appId]);

  // 필드 변경
  const updateField = (key, value) => {
    setImm({ ...imm, [key]: value });
  };

  // 자동 저장 (필드 blur 시)
  const handleBlur = async () => {
    if (!imm) return;
    await supabase
      .from('immigration_applications')
      .update(imm)
      .eq('id', imm.id);
  };

  // 검증: 필수 필드 누락 체크
  const validateRequired = () => {
    const required = [
      ['surname_en', '성 (영문)'],
      ['given_names_en', '명 (영문)'],
      ['date_of_birth', '생년월일'],
      ['sex', '성별'],
      ['nationality', '국적'],
      ['alien_reg_number', '외국인등록번호'],
      ['passport_number', '여권번호'],
      ['passport_issue_date', '여권 발급일자'],
      ['passport_expiry_date', '여권 유효기간'],
      ['address_korea', '대한민국 내 주소'],
      ['cell_phone', '휴대전화'],
      ['address_home_country', '본국 주소'],
      ['email', '이메일'],
      ['school_name', '학교 이름'],
      ['new_workplace_name', '예정 근무처'],
      ['new_workplace_business_no', '사업자등록번호'],
      ['occupation', '직업'],
    ];
    const missing = required.filter(([k]) => !imm[k]);
    return missing.map(([_, label]) => label);
  };

  // 행정정보 공동이용 동의
  const allConsents = imm?.consent_admin_share_self;

  // PDF 생성 + 완료 처리
  const handleGenerate = async () => {
    const missing = validateRequired();
    if (missing.length > 0) {
      alert('다음 필드를 입력해 주세요:\n• ' + missing.join('\n• '));
      return;
    }
    if (!imm.applicant_signature) {
      alert('신청자 서명이 필요합니다');
      setShowSignPad(true);
      return;
    }
    if (!imm.consent_admin_share_self) {
      alert('행정정보 공동이용 동의(본인)가 필요합니다');
      return;
    }

    setSaving(true);
    try {
      // 저장
      await supabase
        .from('immigration_applications')
        .update({ ...imm, status: 'completed' })
        .eq('id', imm.id);

      // PDF 생성 (브라우저에서 직접)
      const html = generateIntegratedFormHTML(imm, partwork);
      const w = window.open('', '_blank');
      if (!w) { alert('팝업이 차단되었습니다'); setSaving(false); return; }
      w.document.write(html);
      w.document.close();

      setImm({ ...imm, status: 'completed' });
    } catch (e) {
      alert('생성 실패: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ 로딩...</div>;
  if (!imm) return null;

  const missingFields = validateRequired();
  const completionRate = Math.round(
    (1 - missingFields.length / 17) * 100
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 100 }}>
      {/* 헤더 */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E4E2DE', padding: '14px 16px',
                     position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: '0.05em' }}>
            IMMIGRATION APPLICATION
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginTop: 2 }}>
            출입국 통합신청서 자동 작성
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
            출입국관리법 시행규칙 [별지 제34호서식]
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>

        {/* 진행률 + 안내 */}
        <div style={{ background: completionRate === 100 ? '#ECFDF5' : '#FEF3C7',
                       border: `1px solid ${completionRate === 100 ? '#A7F3D0' : '#FDE68A'}`,
                       borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>{completionRate === 100 ? '✅' : '📝'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800,
                             color: completionRate === 100 ? '#065F46' : '#92400E' }}>
                {completionRate === 100 ? '입력 완료' : `${17 - missingFields.length}/17 필드 입력됨 (${completionRate}%)`}
              </div>
              <div style={{ fontSize: 11, color: completionRate === 100 ? '#065F46' : '#92400E', marginTop: 2 }}>
                {completionRate === 100
                  ? '신청서 PDF를 생성하고 출입국·외국인청에 제출하세요'
                  : `자동 채워진 정보를 확인하고, ${missingFields.length}개 항목을 추가 입력하세요`}
              </div>
              {missingFields.length > 0 && missingFields.length <= 5 && (
                <div style={{ fontSize: 10, color: '#92400E', marginTop: 4 }}>
                  남은 항목: {missingFields.slice(0, 5).join(', ')}
                </div>
              )}
            </div>
          </div>
          {/* 진행률 바 */}
          <div style={{ height: 6, background: '#FFF', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${completionRate}%`, height: '100%',
              background: completionRate === 100 ? '#10B981' : '#F59E0B',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        {/* 1. 신청 종류 */}
        <Section title="① 신청 종류 / SELECT APPLICATION">
          <div style={{ fontSize: 11, color: '#666', marginBottom: 10, lineHeight: 1.7 }}>
            국제처 담당자 승인이 완료된 시간제취업 신청에 대해
            <strong style={{ color: '#1E40AF' }}> 「체류자격 외 활동허가」</strong>가 자동 선택되었습니다.
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {APPLICATION_TYPES.map(t => (
              <label key={t.value} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: 10, borderRadius: 8,
                background: imm.application_type === t.value ? '#EFF6FF' : '#FFF',
                border: `1px solid ${imm.application_type === t.value ? '#BFDBFE' : '#E4E2DE'}`,
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="app_type"
                  checked={imm.application_type === t.value}
                  onChange={() => updateField('application_type', t.value)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700,
                                 color: imm.application_type === t.value ? '#1E40AF' : '#111' }}>
                    {t.label_ko}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{t.label_en}</div>
                </div>
              </label>
            ))}
          </div>
          {/* 희망 자격 */}
          {['permit_other_activity', 'change_status', 'grant_status'].includes(imm.application_type) && (
            <div style={{ marginTop: 12 }}>
              <Label required>희망 자격 / Status to apply for</Label>
              <input type="text" value={imm.desired_status || ''}
                onChange={(e) => updateField('desired_status', e.target.value)}
                onBlur={handleBlur}
                placeholder="예: D-2-7 (시간제취업)"
                style={inputStyle} />
            </div>
          )}
        </Section>

        {/* 2. 인적사항 */}
        <Section title="② 인적사항 / PERSONAL INFORMATION">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FieldAuto
              label="성 (영문) / Surname"
              value={imm.surname_en}
              onChange={(v) => updateField('surname_en', v?.toUpperCase())}
              onBlur={handleBlur}
              placeholder="HONG"
              required
              autoFilled={!!imm.surname_en}
            />
            <FieldAuto
              label="명 (영문) / Given Names"
              value={imm.given_names_en}
              onChange={(v) => updateField('given_names_en', v?.toUpperCase())}
              onBlur={handleBlur}
              placeholder="GIL DONG"
              required
              autoFilled={!!imm.given_names_en}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <FieldAuto
              label="생년월일 / Date of Birth"
              type="date"
              value={imm.date_of_birth}
              onChange={(v) => updateField('date_of_birth', v)}
              onBlur={handleBlur}
              required
              autoFilled={!!imm.date_of_birth}
            />
            <div>
              <Label required>성별 / Sex</Label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {[
                  { v: 'M', label: '남 / M' },
                  { v: 'F', label: '여 / F' },
                ].map(o => (
                  <label key={o.v} style={{
                    flex: 1, padding: 8, borderRadius: 6,
                    background: imm.sex === o.v ? '#EFF6FF' : '#FFF',
                    border: `1px solid ${imm.sex === o.v ? '#BFDBFE' : '#E4E2DE'}`,
                    cursor: 'pointer', textAlign: 'center', fontSize: 12, fontWeight: 700,
                  }}>
                    <input type="radio" checked={imm.sex === o.v}
                      onChange={() => { updateField('sex', o.v); }}
                      style={{ marginRight: 4 }} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <FieldAuto
              label="국적 / Nationality"
              value={imm.nationality}
              onChange={(v) => updateField('nationality', v)}
              onBlur={handleBlur}
              placeholder="China / Vietnam ..."
              required
              autoFilled={!!imm.nationality}
            />
            <FieldAuto
              label="외국인등록번호 / Foreign Reg. No."
              value={imm.alien_reg_number}
              onChange={(v) => updateField('alien_reg_number', v)}
              onBlur={handleBlur}
              placeholder="000000-0000000"
              required
              autoFilled={!!imm.alien_reg_number}
            />
          </div>
        </Section>

        {/* 3. 여권 정보 */}
        <Section title="③ 여권 / PASSPORT">
          <FieldAuto
            label="여권번호 / Passport No."
            value={imm.passport_number}
            onChange={(v) => updateField('passport_number', v)}
            onBlur={handleBlur}
            placeholder="M12345678"
            required
            autoFilled={!!imm.passport_number}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <FieldAuto
              label="발급일자 / Issue Date"
              type="date"
              value={imm.passport_issue_date}
              onChange={(v) => updateField('passport_issue_date', v)}
              onBlur={handleBlur}
              required
              autoFilled={!!imm.passport_issue_date}
            />
            <FieldAuto
              label="유효기간 / Expiry Date"
              type="date"
              value={imm.passport_expiry_date}
              onChange={(v) => updateField('passport_expiry_date', v)}
              onBlur={handleBlur}
              required
              autoFilled={!!imm.passport_expiry_date}
            />
          </div>
        </Section>

        {/* 4. 주소 / 연락처 */}
        <Section title="④ 주소 및 연락처 / ADDRESS & CONTACT">
          <FieldAuto
            label="대한민국 내 주소 / Address In Korea"
            value={imm.address_korea}
            onChange={(v) => updateField('address_korea', v)}
            onBlur={handleBlur}
            placeholder="서울시 성동구 왕십리로 222 한양대학교 기숙사"
            required
            autoFilled={!!imm.address_korea}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <FieldAuto
              label="휴대전화 / Cell Phone"
              value={imm.cell_phone}
              onChange={(v) => updateField('cell_phone', v)}
              onBlur={handleBlur}
              placeholder="010-1234-5678"
              required
              autoFilled={!!imm.cell_phone}
            />
            <FieldAuto
              label="이메일 / E-Mail"
              type="email"
              value={imm.email}
              onChange={(v) => updateField('email', v)}
              onBlur={handleBlur}
              placeholder="example@email.com"
              required
              autoFilled={!!imm.email}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <FieldAuto
              label="본국 주소 / Address In Home Country"
              value={imm.address_home_country}
              onChange={(v) => updateField('address_home_country', v)}
              onBlur={handleBlur}
              placeholder="본국 주소를 영문으로 입력"
              required
              autoFilled={!!imm.address_home_country}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <FieldAuto
              label="본국 전화 (선택) / Phone (Home)"
              value={imm.phone_home_country || ''}
              onChange={(v) => updateField('phone_home_country', v)}
              onBlur={handleBlur}
              placeholder="+86-10-1234-5678"
              autoFilled={!!imm.phone_home_country}
            />
          </div>
        </Section>

        {/* 5. 학교 / 근무처 */}
        <Section title="⑤ 학교 및 근무처 / SCHOOL & WORKPLACE">
          <FieldAuto
            label="학교 이름 / Name of School"
            value={imm.school_name}
            onChange={(v) => updateField('school_name', v)}
            onBlur={handleBlur}
            required
            autoFilled={!!imm.school_name}
          />
          <div style={{ marginTop: 12 }}>
            <Label>예정 근무처 / New Workplace</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginTop: 4 }}>
              <input
                type="text"
                value={imm.new_workplace_name || ''}
                onChange={(e) => updateField('new_workplace_name', e.target.value)}
                onBlur={handleBlur}
                placeholder="업체명"
                style={{
                  ...inputStyle,
                  background: imm.new_workplace_name ? '#F0FDF4' : '#FFF',
                  borderColor: imm.new_workplace_name ? '#A7F3D0' : '#E4E2DE',
                }}
              />
              <input
                type="text"
                value={imm.new_workplace_business_no || ''}
                onChange={(e) => updateField('new_workplace_business_no', e.target.value)}
                onBlur={handleBlur}
                placeholder="사업자등록번호"
                style={{
                  ...inputStyle,
                  background: imm.new_workplace_business_no ? '#F0FDF4' : '#FFF',
                  borderColor: imm.new_workplace_business_no ? '#A7F3D0' : '#E4E2DE',
                }}
              />
            </div>
            <input
              type="text"
              value={imm.new_workplace_phone || ''}
              onChange={(e) => updateField('new_workplace_phone', e.target.value)}
              onBlur={handleBlur}
              placeholder="근무처 전화번호 (선택)"
              style={{ ...inputStyle, marginTop: 8 }}
            />
          </div>
        </Section>

        {/* 6. 직업 / 소득 */}
        <Section title="⑥ 직업 및 소득 / OCCUPATION & INCOME">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FieldAuto
              label="직업 / Occupation"
              value={imm.occupation || '학생'}
              onChange={(v) => updateField('occupation', v)}
              onBlur={handleBlur}
              required
              autoFilled
            />
            <FieldAuto
              label="연 소득금액 (만원) / Annual Income"
              type="number"
              value={imm.annual_income_10k || 0}
              onChange={(v) => updateField('annual_income_10k', parseInt(v) || 0)}
              onBlur={handleBlur}
              autoFilled={!!imm.annual_income_10k}
            />
          </div>
          {imm.annual_income_10k > 0 && (
            <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
              💡 시간제취업 신청 정보로 자동 계산됨 ({imm.annual_income_10k}만원/년)
            </div>
          )}
        </Section>

        {/* 7. 행정정보 공동이용 동의 */}
        <Section title="⑦ 행정정보 공동이용 동의 / CONSENT">
          <div style={{ fontSize: 11, color: '#666', marginBottom: 10, lineHeight: 1.7 }}>
            본인은 이 건 업무처리와 관련하여 담당 공무원이
            「전자정부법」 제36조에 따른 행정정보의 공동이용을 통하여
            본인의 정보를 확인하는 것에 동의합니다.
          </div>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
            background: imm.consent_admin_share_self ? '#ECFDF5' : '#FFF',
            border: `1px solid ${imm.consent_admin_share_self ? '#A7F3D0' : '#E4E2DE'}`,
            borderRadius: 8, cursor: 'pointer',
          }}>
            <input type="checkbox"
              checked={!!imm.consent_admin_share_self}
              onChange={(e) => updateField('consent_admin_share_self', e.target.checked)}
              style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>본인 동의 / Applicant Consent <span style={{ color: '#DC2626' }}>*</span></div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                I, the undersigned, hereby consent to allow all documents and information required
                for the processing of this application to be viewed by the public servant in charge.
              </div>
            </div>
          </label>
        </Section>

        {/* 8. 신청자 서명 */}
        <Section title="⑧ 신청자 서명 / SIGNATURE">
          {imm.applicant_signature ? (
            <div style={{ padding: 14, background: '#ECFDF5', border: '1px solid #A7F3D0',
                          borderRadius: 8, textAlign: 'center' }}>
              <img src={imm.applicant_signature} alt="서명"
                style={{ maxHeight: 60, background: '#FFF', padding: 6, borderRadius: 4 }} />
              <div style={{ fontSize: 10, color: '#059669', marginTop: 6, fontWeight: 700 }}>
                ✓ 서명 등록됨
              </div>
              <button onClick={() => setShowSignPad(true)} style={{
                marginTop: 8, padding: '6px 12px', background: '#FFF', color: '#059669',
                border: '1.5px solid #059669', borderRadius: 6,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                ✏️ 다시 서명
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSignPad(true)} style={{
              width: '100%', padding: 14, background: '#FFF',
              border: '2px dashed #999', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ✍️ 서명하기
            </button>
          )}
        </Section>

        {/* 안내문 */}
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE',
                       borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 12,
                       color: '#1E40AF', lineHeight: 1.7 }}>
          <strong>📋 제출 방법</strong><br/>
          ① 위 정보 입력 완료 후 「PDF 생성」 클릭<br/>
          ② 생성된 PDF 인쇄 또는 모바일 저장<br/>
          ③ 여권사진(35×45mm), 시간제취업확인서, 표준근로계약서와 함께<br/>
          &nbsp;&nbsp;&nbsp;관할 출입국·외국인청에 제출 (또는 하이코리아 온라인)
        </div>
      </div>

      {/* 하단 액션 바 */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
                     background: '#FFF', borderTop: '1px solid #E4E2DE',
                     padding: 12, zIndex: 20 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <button onClick={handleGenerate} disabled={saving} style={{
            width: '100%', padding: 14,
            background: saving ? '#999'
              : missingFields.length === 0 && imm.applicant_signature && imm.consent_admin_share_self
              ? '#059669' : '#111',
            color: '#FFF', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? '생성 중...'
              : missingFields.length === 0 && imm.applicant_signature && imm.consent_admin_share_self
              ? '📄 통합신청서 PDF 생성'
              : `📝 ${missingFields.length + (imm.applicant_signature?0:1) + (imm.consent_admin_share_self?0:1)}개 항목 입력 후 생성 가능`}
          </button>
        </div>
      </div>

      {/* 서명 모달 */}
      {showSignPad && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, zIndex: 100,
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowSignPad(false); }}>
          <div style={{ background: '#FFF', borderRadius: 12, padding: 20,
                         maxWidth: 500, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>✍️ 신청자 서명</div>
              <button onClick={() => setShowSignPad(false)} style={{
                background: 'none', border: 'none', fontSize: 20, cursor: 'pointer'
              }}>✕</button>
            </div>
            <SignaturePad
              onSave={async (sig) => {
                updateField('applicant_signature', sig);
                await supabase.from('immigration_applications')
                  .update({ applicant_signature: sig }).eq('id', imm.id);
                setShowSignPad(false);
              }}
              initialDataUrl={imm.applicant_signature}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ───── UI 헬퍼 ─────
function Section({ title, children }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 12, padding: 16,
                  marginBottom: 12, border: '1px solid #E4E2DE' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#111',
                    marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F0F0EC' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children, required }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>
      {children} {required && <span style={{ color: '#DC2626' }}>*</span>}
    </div>
  );
}

function FieldAuto({ label, type = 'text', value, onChange, onBlur, placeholder, required, autoFilled }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#444', flex: 1 }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </div>
        {autoFilled && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px',
            borderRadius: 999, color: '#059669', background: '#ECFDF5',
          }}>✓ 자동 입력됨</span>
        )}
        {!autoFilled && required && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px',
            borderRadius: 999, color: '#B45309', background: '#FEF3C7',
          }}>입력 필요</span>
        )}
      </div>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{
          ...inputStyle,
          background: autoFilled ? '#F0FDF4' : (required && !value ? '#FFFBEB' : '#FFF'),
          borderColor: autoFilled ? '#A7F3D0' : (required && !value ? '#FDE68A' : '#E4E2DE'),
        }}
      />
    </label>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  border: '1px solid #E4E2DE', borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', background: '#FFF',
};

// ─────────────── 통합신청서 PDF HTML 생성 ───────────────
function generateIntegratedFormHTML(imm, partwork) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}.`;

  const checkBox = (checked) =>
    `<span style="display:inline-block;width:11px;height:11px;border:1px solid #000;text-align:center;line-height:9px;font-size:10px;vertical-align:middle;">${checked?'✓':''}</span>`;

  const t = imm.application_type;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>통합신청서 / Integrated Application Form</title>
<style>
@page { size: A4; margin: 12mm; }
body { font-family: "Malgun Gothic","맑은 고딕",sans-serif; font-size: 9.5px; color: #000; line-height: 1.5; }
.title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px; }
.title { font-size: 14px; font-weight: bold; text-align: center; flex: 1; }
.caption { font-size: 8px; color: #444; text-align: right; }
.note { font-size: 8.5px; color: #444; margin-bottom: 8px; }
.checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #000; }
.checkbox-cell { padding: 5px 8px; border-right: 1px solid #ccc; border-bottom: 1px solid #ccc; font-size: 9px; }
.section-label { font-size: 9.5px; font-weight: 700; text-align: center; padding: 4px; background: #d9d9d9; border: 1px solid #000; margin-top: 6px; }
table.form { width: 100%; border-collapse: collapse; margin-top: 4px; }
table.form th, table.form td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; font-size: 9px; }
table.form th { background: #f0f0f0; font-weight: 700; text-align: center; }
.fill { color: #1e40af; font-weight: 600; }
.empty { color: #aaa; }
.consent { padding: 6px 4px; font-size: 8.5px; line-height: 1.6; margin-top: 8px; }
.signature-img { max-height: 30px; max-width: 90px; vertical-align: middle; }
.print-btn { position: fixed; top: 8px; right: 8px; padding: 8px 14px; background: #00B37E; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
@media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF로 저장</button>

<div class="title-row">
  <div></div>
  <div class="title">통합신청서 (신고서)</div>
  <div class="caption">[별지 제34호서식]</div>
</div>
<div style="text-align:center;font-size:11px;font-weight:700;margin-bottom:6px;">APPLICATION FORM (REPORT FORM)</div>
<div class="note">※ 신청서는 한글 또는 영문으로 작성하시기 바랍니다 / Please complete this form in Korean or English.</div>

<!-- 신청 종류 -->
<div class="section-label">□ 신청/신고 선택 SELECT APPLICATION/REPORT</div>
<div class="checkbox-grid">
  <div class="checkbox-cell">${checkBox(t==='foreign_resident_registration')} 외국인 등록 / FOREIGN RESIDENT REGISTRATION</div>
  <div class="checkbox-cell">${checkBox(t==='permit_other_activity')} 체류자격 외 활동허가 (희망 자격: <span class="fill">${imm.desired_status||''}</span>)</div>
  <div class="checkbox-cell">${checkBox(t==='reissue_card')} 등록증 재발급 / REISSUANCE OF REGISTRATION CARD</div>
  <div class="checkbox-cell">${checkBox(t==='change_workplace')} 근무처 변경·추가허가/신고</div>
  <div class="checkbox-cell">${checkBox(t==='extend_period')} 체류기간 연장허가</div>
  <div class="checkbox-cell">${checkBox(t==='reentry_permit')} 재입국허가 (${checkBox(imm.reentry_type==='single')} 단수, ${checkBox(imm.reentry_type==='multiple')} 복수)</div>
  <div class="checkbox-cell">${checkBox(t==='change_status')} 체류자격 변경허가 (희망 자격: <span class="fill">${t==='change_status'?(imm.desired_status||''):''}</span>)</div>
  <div class="checkbox-cell">${checkBox(t==='alteration_residence')} 체류지 변경신고</div>
  <div class="checkbox-cell">${checkBox(t==='grant_status')} 체류자격 부여 (희망 자격: <span class="fill">${t==='grant_status'?(imm.desired_status||''):''}</span>)</div>
  <div class="checkbox-cell">${checkBox(t==='register_change')} 등록사항 변경신고</div>
</div>

<!-- 인적사항 -->
<table class="form" style="margin-top:8px;">
  <tr>
    <th rowspan="2" style="width:14%;">성명<br>Name In Full</th>
    <th>성 Surname</th>
    <td colspan="2" class="fill">${imm.surname_en||''}</td>
    <th>명 Given names</th>
    <td colspan="2" class="fill">${imm.given_names_en||''}</td>
  </tr>
  <tr>
    <th>생년월일<br>Date of Birth</th>
    <td class="fill">${imm.date_of_birth||''}</td>
    <th>성별 Sex</th>
    <td>${checkBox(imm.sex==='M')} 남 M &nbsp;${checkBox(imm.sex==='F')} 여 F</td>
    <th>국적<br>Nationality</th>
    <td class="fill">${imm.nationality||''}</td>
  </tr>
  <tr>
    <th>외국인등록번호<br>Foreign Reg. No.</th>
    <td colspan="2" class="fill">${imm.alien_reg_number||''}</td>
    <th>여권번호<br>Passport No.</th>
    <td colspan="3" class="fill">${imm.passport_number||''}</td>
  </tr>
  <tr>
    <th>여권 발급일자<br>Issue Date</th>
    <td colspan="2" class="fill">${imm.passport_issue_date||''}</td>
    <th>여권 유효기간<br>Expiry Date</th>
    <td colspan="3" class="fill">${imm.passport_expiry_date||''}</td>
  </tr>
  <tr>
    <th>대한민국 내 주소<br>Address In Korea</th>
    <td colspan="6" class="fill">${imm.address_korea||''}</td>
  </tr>
  <tr>
    <th>전화번호<br>Telephone</th>
    <td colspan="2" class="fill">${imm.phone_korea||''}</td>
    <th>휴대전화<br>Cell phone</th>
    <td colspan="3" class="fill">${imm.cell_phone||''}</td>
  </tr>
  <tr>
    <th>본국 주소<br>Address Home</th>
    <td colspan="4" class="fill">${imm.address_home_country||''}</td>
    <th>전화번호<br>Phone</th>
    <td colspan="2" class="fill">${imm.phone_home_country||''}</td>
  </tr>
</table>

<!-- 학교 -->
<table class="form" style="margin-top:6px;">
  <tr>
    <th rowspan="2" style="width:14%;">재학 여부<br>School Status</th>
    <td colspan="6">
      ${checkBox(imm.school_status==='non_school')} 미취학 &nbsp;
      ${checkBox(imm.school_status==='elementary')} 초 &nbsp;
      ${checkBox(imm.school_status==='middle')} 중 &nbsp;
      ${checkBox(imm.school_status==='high')} 고 &nbsp;
      ${checkBox(imm.school_status==='university')} 대학 (자동)
    </td>
  </tr>
  <tr>
    <th>학교 이름<br>Name of School</th>
    <td colspan="3" class="fill">${imm.school_name||''}</td>
    <th>학교 종류<br>Type</th>
    <td colspan="2">${checkBox(imm.school_type==='accredited')} 인가 &nbsp; ${checkBox(imm.school_type==='non_accredited_alternative')} 비인가/대안</td>
  </tr>
</table>

<!-- 근무처 -->
<table class="form" style="margin-top:6px;">
  <tr>
    <th rowspan="2" style="width:14%;">근무처<br>Workplace</th>
    <th>예정 근무처<br>New Workplace</th>
    <td class="fill">${imm.new_workplace_name||''}</td>
    <th>사업자등록번호<br>Business No.</th>
    <td class="fill">${imm.new_workplace_business_no||''}</td>
    <th>전화번호<br>Phone</th>
    <td class="fill">${imm.new_workplace_phone||''}</td>
  </tr>
  <tr>
    <th>현 근무처<br>Current</th>
    <td class="fill">${imm.current_workplace_name||''}</td>
    <th>사업자등록번호</th>
    <td class="fill">${imm.current_workplace_business_no||''}</td>
    <th>전화번호</th>
    <td class="fill">${imm.current_workplace_phone||''}</td>
  </tr>
</table>

<!-- 기타 -->
<table class="form" style="margin-top:6px;">
  <tr>
    <th style="width:18%;">연 소득금액<br>Annual Income</th>
    <td class="fill">${imm.annual_income_10k||0} 만원</td>
    <th>직업<br>Occupation</th>
    <td class="fill">${imm.occupation||''}</td>
  </tr>
  <tr>
    <th>재입국 신청 기간<br>Reentry Period</th>
    <td class="fill">${imm.reentry_period||'-'}</td>
    <th>전자우편<br>E-Mail</th>
    <td class="fill">${imm.email||''}</td>
  </tr>
  <tr>
    <th>반환용 계좌번호<br>(외국인등록 시)</th>
    <td colspan="3" class="fill">${imm.bank_account_refund||'-'}</td>
  </tr>
</table>

<!-- 서명·날짜 -->
<table class="form" style="margin-top:6px;">
  <tr>
    <th style="width:18%;">신청일<br>Date</th>
    <td class="fill">${dateStr}</td>
    <th>신청인 서명 또는 인<br>Signature</th>
    <td>${imm.applicant_signature ? `<img src="${imm.applicant_signature}" class="signature-img">` : '(서명)'}</td>
  </tr>
</table>

<!-- 행정정보 공동이용 동의 -->
<div class="section-label" style="margin-top:8px;">행정정보 공동이용 동의서 (Consent for sharing of administrative information)</div>
<div class="consent">
본인은 이 건 업무처리와 관련하여 담당 공무원이 「전자정부법」 제36조에 따른 행정정보의 공동이용을 통하여 위의 담당 공무원 확인 사항을 확인하는 것에 동의합니다.<br>
I, the undersigned, hereby consent to allow all documents and information required for the processing of this application to be viewed by the public servant in charge as specified in Article 36 of the Electronic Government Act.
</div>
<table class="form">
  <tr>
    <th style="width:25%;">신청인 / Applicant</th>
    <td>${imm.consent_admin_share_self ? '☑ 동의 (Consent)' : '□'} ${imm.applicant_signature ? `<img src="${imm.applicant_signature}" class="signature-img" style="max-height:24px;">` : ''}</td>
  </tr>
</table>

<div style="font-size:8px;color:#888;margin-top:10px;text-align:center;">
※ 수입인지는 뒷면에 첨부 / Revenue Stamp on the Backside
</div>
<div style="font-size:7.5px;color:#aaa;margin-top:4px;text-align:right;">210㎜×297㎜[백상지 80g/㎡]</div>

</body></html>`;
}
