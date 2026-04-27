"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/**
 * /staff/register — 대학 첫 admin 등록 신청
 *
 * 흐름:
 * 1. 학교가 K-ALBA에 처음 가입할 때 (대학별 1회) 사용
 * 2. 신청자(국제처 직원)가 본인 정보 + 공문 + 직원증 업로드
 * 3. 운영팀이 영업일 1~2일 내 검증 (도메인/공문/통화 4가지)
 * 4. 승인되면 environment-신청자 이메일로 첫 admin 계정 활성화
 *
 * 검증 항목 (자동):
 *   - 학교 검색 (universities 테이블)
 *   - 이메일 도메인 = 학교 공식 도메인
 *   - 첨부 파일 형식 (PDF, JPG, PNG)
 */
export default function StaffRegisterPage() {
  const router = useRouter();
  const [universities, setUniversities] = useState([]);
  const [universityQuery, setUniversityQuery] = useState('');
  const [selectedUni, setSelectedUni] = useState(null);
  const [domainStatus, setDomainStatus] = useState(null); // null | 'ok' | 'mismatch' | 'no_whitelist'

  const [form, setForm] = useState({
    applicant_name: '',
    applicant_position: '',
    applicant_email: '',
    applicant_office_phone: '',
    applicant_phone: '',
    department: '국제처',
    notes: '',
  });

  const [files, setFiles] = useState({
    official_letter: null,  // 공문 PDF
    id_card: null,          // 직원증
    business_card: null,    // 명함 (선택)
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // 대학 검색
  useEffect(() => {
    if (!universityQuery || universityQuery.length < 2) {
      setUniversities([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('universities')
        .select('id, name, allowed_email_domains, registered_at')
        .ilike('name', `%${universityQuery}%`)
        .limit(8);
      if (!cancelled) setUniversities(data || []);
    })();
    return () => { cancelled = true; };
  }, [universityQuery]);

  // 이메일 도메인 자동 검증
  useEffect(() => {
    if (!form.applicant_email || !selectedUni) {
      setDomainStatus(null);
      return;
    }
    const domain = form.applicant_email.split('@')[1]?.toLowerCase();
    if (!domain) { setDomainStatus(null); return; }

    const allowed = selectedUni.allowed_email_domains || [];
    if (allowed.length === 0) {
      setDomainStatus('no_whitelist');
    } else if (allowed.some(d => domain === d || domain.endsWith('.' + d))) {
      setDomainStatus('ok');
    } else {
      setDomainStatus('mismatch');
    }
  }, [form.applicant_email, selectedUni]);

  const validate = () => {
    const e = {};
    if (!selectedUni) e.uni = '대학을 선택해 주세요';
    if (!form.applicant_name.trim()) e.name = '성명을 입력해 주세요';
    if (!form.applicant_position.trim()) e.position = '직위를 입력해 주세요';
    if (!form.applicant_email.trim()) e.email = '이메일을 입력해 주세요';
    if (!form.applicant_office_phone.trim()) e.office_phone = '학교 사무실 전화번호를 입력해 주세요';

    // 도메인 검증
    if (selectedUni && form.applicant_email) {
      if (domainStatus === 'mismatch') {
        e.email = '학교 공식 이메일 도메인이 아닙니다';
      } else if (domainStatus === 'no_whitelist') {
        // 화이트리스트 미설정 시는 운영팀 검증으로 대체
      }
    }

    if (!files.official_letter) e.letter = '공문 파일을 첨부해 주세요';
    if (!files.id_card) e.id_card = '직원증 사진을 첨부해 주세요';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // 첫 에러 위치로 스크롤
      const firstKey = Object.keys(errors)[0];
      if (firstKey) {
        document.getElementById('field-' + firstKey)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);
    try {
      // 1. 파일 업로드 (Supabase Storage)
      const uploadFile = async (file, prefix) => {
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `registrations/${selectedUni.id}/${prefix}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from('staff-documents')
          .upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('staff-documents').getPublicUrl(path);
        return data.publicUrl;
      };

      const letter_url   = await uploadFile(files.official_letter, 'letter');
      const id_card_url  = await uploadFile(files.id_card, 'id-card');
      const business_url = files.business_card
        ? await uploadFile(files.business_card, 'business-card')
        : null;

      // 2. 신청서 저장
      const { data, error } = await supabase
        .from('staff_registrations')
        .insert({
          university_id: selectedUni.id,
          university_name: selectedUni.name,
          applicant_name: form.applicant_name.trim(),
          applicant_position: form.applicant_position.trim(),
          applicant_email: form.applicant_email.trim().toLowerCase(),
          applicant_phone: form.applicant_phone.trim(),
          applicant_office_phone: form.applicant_office_phone.trim() || null,
          department: form.department.trim() || '국제처',
          official_letter_url: letter_url,
          id_card_url: id_card_url,
          business_card_url: business_url,
          notes: form.notes.trim() || null,
          // 자동 검증 1단계: 도메인 매칭
          verified_domain_match: domainStatus === 'ok',
          status: 'submitted',
          user_agent: navigator.userAgent.substring(0, 200),
        })
        .select()
        .single();

      if (error) throw error;

      // 3. 운영팀에 알림 (비동기)
      fetch('/api/staff/registrations/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_id: data.id }),
      }).catch(() => {/* 실패해도 신청 자체는 완료 */});

      setSubmitted(true);
    } catch (e) {
      alert('신청 실패: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 완료 화면
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F0',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     padding: 16 }}>
        <div style={{ background: '#FFF', borderRadius: 16, padding: 32,
                      maxWidth: 500, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginTop: 12 }}>
              신청이 접수되었습니다
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 8, lineHeight: 1.7 }}>
              K-ALBA 운영팀이 영업일 기준 <strong style={{ color: '#1E40AF' }}>1~2일 이내</strong>에
              검증 후 결과를 이메일로 안내드리겠습니다.
            </div>
          </div>

          <div style={{ background: '#F5F5F0', borderRadius: 10, padding: 14, marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8 }}>
              검증 절차 (운영팀)
            </div>
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
              ① 첨부 공문 진위 확인<br/>
              ② 학교 대표번호로 본인 통화 확인<br/>
              ③ 학교 홈페이지 담당자 정보 일치 확인<br/>
              ④ 직원증 사진 검토<br/>
              ⑤ 첫 admin 계정 활성화 → 안내 이메일
            </div>
          </div>

          <Link href="/" style={{ display: 'block', width: '100%', padding: 12, marginTop: 20,
            background: '#111', color: '#FFF', textAlign: 'center', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: 800 }}>
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E4E2DE', padding: '14px 16px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: '0.05em' }}>
            STAFF REGISTRATION
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111', marginTop: 2 }}>
            국제처 담당자 등록 신청
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
        {/* 안내 */}
        <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE',
                       borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1E40AF', marginBottom: 8 }}>
            📌 이 페이지는 누구를 위한 것인가요?
          </div>
          <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.7 }}>
            <strong>대학별 첫 번째 국제처 담당자(관리자)</strong> 등록을 위한 페이지입니다.<br/>
            <span style={{ fontSize: 11, color: '#3B82F6' }}>
              이미 우리 대학 담당자가 등록되어 있다면, 기존 담당자에게 초대를 요청해 주세요.
            </span>
          </div>
        </div>

        {/* 1. 대학 선택 */}
        <Section title="① 대학 선택">
          <div id="field-uni">
            <Field label="대학 검색" required error={errors.uni}>
              <input
                type="text"
                value={universityQuery}
                onChange={(e) => { setUniversityQuery(e.target.value); setSelectedUni(null); }}
                placeholder="예: 한양대학교"
                style={inputStyle}
              />
            </Field>

            {/* 검색 결과 */}
            {universities.length > 0 && !selectedUni && (
              <div style={{ background: '#FFF', border: '1px solid #E4E2DE', borderRadius: 8,
                            marginTop: 8, maxHeight: 250, overflow: 'auto' }}>
                {universities.map(u => (
                  <button key={u.id}
                    onClick={() => { setSelectedUni(u); setUniversityQuery(u.name); setUniversities([]); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px', background: 'none', border: 'none',
                      borderBottom: '1px solid #F0F0EC', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13,
                    }}>
                    <div style={{ fontWeight: 700, color: '#111' }}>
                      {u.name}
                      {u.registered_at && (
                        <span style={{ marginLeft: 6, fontSize: 9, padding: '2px 6px',
                                        background: '#FEF3C7', color: '#92400E',
                                        borderRadius: 999, fontWeight: 700 }}>
                          ⚠️ 이미 등록됨
                        </span>
                      )}
                    </div>
                    {u.allowed_email_domains?.length > 0 && (
                      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                        허용 도메인: @{u.allowed_email_domains.join(', @')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 대학 + 이미 등록 경고 */}
            {selectedUni && selectedUni.registered_at && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A',
                             borderRadius: 8, padding: 12, marginTop: 8, fontSize: 12,
                             color: '#92400E', lineHeight: 1.7 }}>
                ⚠️ <strong>{selectedUni.name}</strong>에는 이미 등록된 담당자가 있습니다.<br/>
                새 담당자 추가는 기존 담당자(관리자)의 초대를 통해서만 가능합니다.
                기존 담당자를 모르신다면 운영팀(support@k-alba.kr)에 문의해 주세요.
              </div>
            )}
          </div>
        </Section>

        {/* 2. 신청자 정보 */}
        <Section title="② 신청자 본인 정보">
          <Field label="성명" required error={errors.name}>
            <input id="field-name" type="text" value={form.applicant_name}
              onChange={(e) => setForm({ ...form, applicant_name: e.target.value })}
              placeholder="홍길동" style={inputStyle} />
          </Field>
          <Field label="직위" required error={errors.position}>
            <input id="field-position" type="text" value={form.applicant_position}
              onChange={(e) => setForm({ ...form, applicant_position: e.target.value })}
              placeholder="국제처장 / 유학생지원팀장" style={inputStyle} />
          </Field>
          <Field label="소속 부서">
            <input type="text" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="국제처" style={inputStyle} />
          </Field>

          {/* 학교 공식 이메일 (도메인 자동 검증) */}
          <div id="field-email">
            <Field label="학교 공식 이메일" required error={errors.email}>
              <input type="email" value={form.applicant_email}
                onChange={(e) => setForm({ ...form, applicant_email: e.target.value })}
                placeholder="staff@university.ac.kr" style={inputStyle} />
            </Field>
            {/* 도메인 상태 표시 */}
            {form.applicant_email && selectedUni && domainStatus && (
              <div style={{
                marginTop: -6, marginBottom: 10,
                padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                ...(domainStatus === 'ok' ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
                  : domainStatus === 'mismatch' ? { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }
                  : { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' })
              }}>
                {domainStatus === 'ok' && '✅ 학교 공식 도메인 매칭 (자동 1차 검증 통과)'}
                {domainStatus === 'mismatch' && (
                  <>❌ 학교 공식 도메인이 아닙니다.<br/>
                    <span style={{ fontWeight: 500, fontSize: 10 }}>
                      허용 도메인: @{selectedUni.allowed_email_domains?.join(', @')}
                    </span>
                  </>
                )}
                {domainStatus === 'no_whitelist' && (
                  <>⚠️ 이 대학은 아직 도메인이 등록되지 않았습니다.
                    운영팀이 수동으로 검증할 예정입니다.</>
                )}
              </div>
            )}
          </div>

          <Field label="학교 사무실 전화 (운영팀 통화 검증용)" required error={errors.office_phone}>
            <input id="field-office_phone" type="tel" value={form.applicant_office_phone}
              onChange={(e) => setForm({ ...form, applicant_office_phone: e.target.value })}
              placeholder="02-1234-5678" style={inputStyle} />
            <div style={{ fontSize: 10, color: '#666', marginTop: 4, lineHeight: 1.6 }}>
              💡 운영팀이 학교 대표번호 또는 부서 직통번호로 직접 전화하여 본인 확인합니다.
              학교 홈페이지에서 공개된 번호와 일치해야 합니다.
            </div>
          </Field>
          <Field label="휴대전화 (선택)">
            <input type="tel" value={form.applicant_phone}
              onChange={(e) => setForm({ ...form, applicant_phone: e.target.value })}
              placeholder="010-1234-5678" style={inputStyle} />
          </Field>
        </Section>

        {/* 3. 검증 자료 */}
        <Section title="③ 검증 자료 첨부">
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.7, marginBottom: 12 }}>
            아래 자료는 운영팀이 신청자의 신원과 권한을 확인하는 데 사용됩니다.
          </div>

          <FileField
            id="field-letter"
            label="공문 (필수)"
            required
            error={errors.letter}
            help="국제처장 / 학장 / 처장 등 학교 책임자 명의로 발급되고, 학교 직인이 찍힌 공문 PDF"
            file={files.official_letter}
            onChange={(f) => setFiles({ ...files, official_letter: f })}
            accept="application/pdf"
          />
          <FileField
            id="field-id_card"
            label="직원증 사진 (필수)"
            required
            error={errors.id_card}
            help="이름과 사진이 명확히 보이도록 촬영. 사번 등 민감정보는 가려도 됨"
            file={files.id_card}
            onChange={(f) => setFiles({ ...files, id_card: f })}
            accept="image/*"
          />
          <FileField
            label="명함 (선택)"
            help="추가 신원 확인용"
            file={files.business_card}
            onChange={(f) => setFiles({ ...files, business_card: f })}
            accept="image/*"
          />
        </Section>

        {/* 4. 추가 메모 */}
        <Section title="④ 추가 안내사항 (선택)">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="운영팀에 전달할 추가 정보가 있다면 자유롭게 작성해 주세요&#10;&#10;예: 우리 대학에는 어학연수 학생만 있어서, 일반 학사 과정은 신청 대상이 아닙니다."
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          />
        </Section>

        {/* 개인정보 안내 + 제출 */}
        <div style={{ background: '#F5F5F0', border: '1px solid #E4E2DE', borderRadius: 10,
                       padding: 14, fontSize: 11, color: '#444', lineHeight: 1.7, marginBottom: 16 }}>
          🔒 첨부하신 개인정보(직원증, 연락처 등)는 신원 확인 목적으로만 사용되며,
          승인 후 30일 내 자동 삭제됩니다.
          이미 등록된 학교의 추가 담당자는 본 페이지가 아닌 기존 담당자의 초대를 통해 가입하셔야 합니다.
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{
          width: '100%', padding: 14,
          background: submitting ? '#999' : '#111', color: '#FFF',
          border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}>
          {submitting ? '제출 중...' : '📨 신청서 제출'}
        </button>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#888' }}>
          문의: <a href="mailto:support@k-alba.kr" style={{ color: '#1E40AF' }}>support@k-alba.kr</a>
        </div>
      </div>
    </div>
  );
}

// ──────── UI 헬퍼 ────────
function Section({ title, children }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
                  border: '1px solid #E4E2DE' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#111',
                    marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #F0F0EC' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </div>
      {children}
      {error && (
        <div style={{ fontSize: 10, color: '#DC2626', marginTop: 4, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </label>
  );
}

function FileField({ id, label, required, error, help, file, onChange, accept }) {
  return (
    <div id={id} style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </div>
      {help && (
        <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
          {help}
        </div>
      )}
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input
          type="file" accept={accept} style={{ display: 'none' }}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <div style={{
          padding: '10px 14px', borderRadius: 6,
          border: `1.5px ${file ? 'solid #A7F3D0' : 'dashed #E4E2DE'}`,
          background: file ? '#ECFDF5' : '#FFF',
          fontSize: 12, color: file ? '#065F46' : '#888',
          fontWeight: file ? 700 : 500,
        }}>
          {file ? `✓ ${file.name} (${(file.size/1024).toFixed(0)}KB)` : '📎 파일 선택'}
        </div>
      </label>
      {error && (
        <div style={{ fontSize: 10, color: '#DC2626', marginTop: 4, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
  border: '1px solid #E4E2DE', borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', background: '#FFF',
};
