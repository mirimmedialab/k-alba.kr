"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";

/**
 * /staff/partwork/[id] — 신청서 상세 검토 + 서명
 *
 * 기능:
 *   1. 학생 정보·자격·근무 정보·자동 분석 결과 표시
 *   2. 첨부 서류 6종 미리보기 (signed URL)
 *   3. 시간제취업확인서 미리보기 (담당자 서명 전/후)
 *   4. 디지털 서명 (Canvas)
 *   5. 추가 서류 요청 / 반려 / 승인
 *   6. 처리 이력 (audit log)
 *
 * 자동 동작:
 *   - 페이지 진입 시 status가 submitted → reviewing으로 전환
 *   - "서명" 클릭 시 status가 signed로 자동 전환 (DB 트리거)
 *   - 모든 액션은 partwork_review_log에 기록
 */
const STATUS_LABELS = {
  submitted:        { label: '제출됨',        color: '#1E40AF', bg: '#DBEAFE' },
  reviewing:        { label: '검토 중',       color: '#92400E', bg: '#FEF3C7' },
  documents_needed: { label: '추가 서류 요청', color: '#9333EA', bg: '#F3E8FF' },
  signed:           { label: '서명 완료',     color: '#059669', bg: '#ECFDF5' },
  approved:         { label: '승인',          color: '#065F46', bg: '#D1FAE5' },
  rejected:         { label: '반려',          color: '#991B1B', bg: '#FEE2E2' },
};

const DOC_LABELS = {
  contract_file_url:    { name: '표준근로계약서', icon: '📄', required: true },
  enrollment_file_url:  { name: '재학증명서',     icon: '🎓', required: true },
  grade_file_url:       { name: '성적증명서',     icon: '📊', required: true },
  topik_cert_file_url:  { name: '한국어능력증명서', icon: '🇰🇷', required: true },
  passport_file_url:    { name: '여권 사본',      icon: '🛂', required: true },
  arc_file_url:         { name: '외국인등록증',   icon: '🪪', required: true },
};

export default function StaffPartworkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params?.id;

  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [application, setApplication] = useState(null);
  const [reviewLog, setReviewLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI 상태
  const [showSignPad, setShowSignPad] = useState(false);
  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState([]);
  const [requestNote, setRequestNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [staffCertifiedCheck, setStaffCertifiedCheck] = useState(null);
  const [busy, setBusy] = useState(false);

  // 로드
  useEffect(() => {
    if (!appId) return;
    (async () => {
      try {
        const u = await getCurrentUser();
        if (!u) {
          router.push('/login?redirect=/staff/partwork/' + appId);
          return;
        }
        setUser(u);

        // 담당자 권한 확인
        const { data: staffRecord } = await supabase
          .from('university_staff')
          .select('*, university:universities(*)')
          .eq('user_id', u.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!staffRecord) {
          setError('담당자 권한이 없습니다');
          setLoading(false);
          return;
        }
        setStaff(staffRecord);

        // 신청서 로드
        const { data: app, error: appErr } = await supabase
          .from('partwork_applications')
          .select('*')
          .eq('id', appId)
          .single();

        if (appErr || !app) {
          setError('신청서를 찾을 수 없거나 접근 권한이 없습니다 (RLS)');
          setLoading(false);
          return;
        }

        // 자기 대학 신청서인지 확인 (이중 검증)
        if (app.university_name !== staffRecord.university.name) {
          setError('다른 대학의 신청서입니다');
          setLoading(false);
          return;
        }

        setApplication(app);
        setStaffCertifiedCheck(app.staff_certified_check ?? staffRecord.university.certified ?? false);

        // 처리 이력 로드
        const { data: logs } = await supabase
          .from('partwork_review_log')
          .select('*')
          .eq('application_id', appId)
          .order('created_at', { ascending: true });
        setReviewLog(logs || []);

        // status가 submitted이면 자동으로 reviewing 전환
        if (app.status === 'submitted') {
          await supabase
            .from('partwork_applications')
            .update({ status: 'reviewing', reviewing_at: new Date().toISOString(),
                      reviewer_id: staffRecord.id })
            .eq('id', appId);
          await logAction(staffRecord.id, 'opened', '담당자가 신청서를 열어봤습니다');
          setApplication({ ...app, status: 'reviewing', reviewing_at: new Date().toISOString() });
        }

        setLoading(false);
      } catch (e) {
        setError('오류: ' + e.message);
        setLoading(false);
      }
    })();
  }, [appId]);

  const logAction = async (staffId, action, note) => {
    await supabase.from('partwork_review_log').insert({
      application_id: appId,
      staff_id: staffId,
      action,
      note,
      user_agent: navigator.userAgent.substring(0, 200),
    });
  };

  // 서명 저장
  const handleSign = async (signatureDataUrl) => {
    if (!signatureDataUrl) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('partwork_applications')
        .update({
          staff_signature: signatureDataUrl,
          staff_signed_by: staff.id,
          staff_certified_check: staffCertifiedCheck,
          status: 'signed', // 트리거가 자동 처리하지만 명시
        })
        .eq('id', appId);

      if (error) throw error;
      await logAction(staff.id, 'signed', '담당자가 시간제취업확인서에 서명했습니다');

      // 서명을 담당자 기본 서명으로도 저장 (다음 신청서에 자동 사용)
      await supabase
        .from('university_staff')
        .update({ default_signature: signatureDataUrl, signature_updated_at: new Date().toISOString() })
        .eq('id', staff.id);

      setApplication({ ...application, staff_signature: signatureDataUrl,
                        status: 'signed', staff_signature_at: new Date().toISOString() });
      setShowSignPad(false);
      alert('✅ 서명이 완료되었습니다. 시간제취업확인서가 학생에게 발송됩니다.');
    } catch (e) {
      alert('서명 실패: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // 추가 서류 요청
  const handleRequestDocs = async () => {
    if (requestedDocs.length === 0) {
      alert('요청할 서류를 선택해 주세요');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('partwork_applications')
        .update({
          status: 'documents_needed',
          documents_requested: requestedDocs,
          documents_requested_at: new Date().toISOString(),
          documents_requested_note: requestNote || null,
        })
        .eq('id', appId);
      if (error) throw error;
      await logAction(staff.id, 'requested_docs',
        `추가 서류 요청: ${requestedDocs.join(', ')}${requestNote ? ' / ' + requestNote : ''}`);
      setApplication({ ...application, status: 'documents_needed' });
      setShowRequestDocs(false);
      alert('✅ 학생에게 추가 서류 요청이 발송되었습니다.');
    } catch (e) {
      alert('요청 실패: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // 반려
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('반려 사유를 입력해 주세요');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('partwork_applications')
        .update({ status: 'rejected', rejection_reason: rejectReason })
        .eq('id', appId);
      if (error) throw error;
      await logAction(staff.id, 'rejected', rejectReason);
      setApplication({ ...application, status: 'rejected', rejection_reason: rejectReason });
      setShowRejectModal(false);
      alert('반려 처리되었습니다');
    } catch (e) {
      alert('반려 실패: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // 최종 승인 (출입국 허가받았을 때)
  const handleApprove = async () => {
    if (!confirm('이 신청을 최종 승인 처리할까요? (출입국 허가서 수령 후)')) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('partwork_applications')
        .update({ status: 'approved' })
        .eq('id', appId);
      if (error) throw error;
      await logAction(staff.id, 'approved', '출입국 허가 후 최종 승인');
      setApplication({ ...application, status: 'approved' });
    } catch (e) {
      alert('승인 실패: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  // 시간제취업확인서 미리보기 (서명 포함/미포함)
  const previewConfirmation = () => {
    const html = generateConfirmationFormHTML(application, staff, staffCertifiedCheck);
    const w = window.open('', '_blank');
    if (!w) { alert('팝업이 차단되었습니다'); return; }
    w.document.write(html);
    w.document.close();
  };

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center' }}>⏳ 로딩...</div>;
  }
  if (error) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: '#FEF2F2', padding: 24, borderRadius: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontWeight: 800, color: '#991B1B', marginTop: 12 }}>{error}</div>
          <Link href="/staff/partwork" style={{ display: 'inline-block', marginTop: 16,
            padding: '10px 20px', background: '#111', color: '#FFF', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← 목록으로</Link>
        </div>
      </div>
    );
  }

  const a = application;
  const status = STATUS_LABELS[a.status] || STATUS_LABELS.submitted;
  const isFinalized = ['signed', 'approved', 'rejected'].includes(a.status);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 100 }}>
      {/* 헤더 */}
      <div style={{ background: '#FFF', borderBottom: '1px solid #E4E2DE', padding: '12px 16px',
                    position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/staff/partwork" style={{ color: '#111', fontSize: 18, textDecoration: 'none' }}>←</Link>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#888' }}>신청서 #{a.id}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
              {a.worker_name} · {a.employer_name}
            </div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: status.bg, color: status.color }}>
            {status.label}
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
        {/* 학생 정보 */}
        <Section title="학생 정보">
          <Row label="성명" value={a.worker_name || '-'} />
          <Row label="비자" value={`${a.visa}${a.arrival_date ? ' · 입국 ' + a.arrival_date : ''}`} />
          <Row label="대학 / 과정" value={`${a.university_name} · ${courseLabel(a.course)}`} />
          <Row label="TOPIK" value={a.topik_level === 0 ? '없음' : `${a.topik_level}급`} />
        </Section>

        {/* 근무 정보 */}
        <Section title="근무 정보">
          <Row label="근무처" value={a.employer_name} />
          <Row label="사업자등록번호" value={a.employer_business_no || '-'} />
          <Row label="직무" value={a.position || '-'} />
          <Row label="근무 요일" value={Array.isArray(a.work_days) ? a.work_days.join('·') : (a.work_days || '-')} />
          <Row label="주당 시간" value={`${a.weekly_hours}시간`} />
          <Row label="시급" value={a.hourly_pay ? `${Number(a.hourly_pay).toLocaleString()}원` : '-'} />
          <Row label="기간" value={`${a.contract_start || '-'} ~ ${a.contract_end || '-'}`} />
        </Section>

        {/* 첨부 서류 */}
        <Section title="첨부 서류">
          {Object.entries(DOC_LABELS).map(([key, info]) => {
            const url = a[key];
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: '1px solid #F0F0EC',
              }}>
                <span style={{ fontSize: 18 }}>{info.icon}</span>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#111' }}>
                  {info.name}
                  <span style={{ marginLeft: 6, fontSize: 9, color: info.required ? '#DC2626' : '#888' }}>
                    {info.required ? '필수' : '선택'}
                  </span>
                </div>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{
                    padding: '6px 10px', background: '#1E40AF', color: '#FFF',
                    borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none',
                  }}>
                    📄 보기
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: '#999' }}>미제출</span>
                )}
              </div>
            );
          })}
        </Section>

        {/* 인증대학 체크 */}
        {!isFinalized && (
          <Section title="유학생담당자 확인">
            <div style={{ display: 'flex', gap: 14, padding: '8px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={staffCertifiedCheck === true}
                  onChange={() => setStaffCertifiedCheck(true)} />
                <span style={{ fontSize: 13 }}>✓ 인증대학 (해당)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" checked={staffCertifiedCheck === false}
                  onChange={() => setStaffCertifiedCheck(false)} />
                <span style={{ fontSize: 13 }}>✗ 비인증대학</span>
              </label>
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
              IEQAS 인증대학 여부 — 시간제취업확인서에 표시됩니다
            </div>
          </Section>
        )}

        {/* 시간제취업확인서 미리보기 */}
        <Section title="시간제취업확인서">
          <button onClick={previewConfirmation} style={{
            width: '100%', padding: '11px 14px',
            background: a.staff_signature ? '#ECFDF5' : '#FFF',
            color: a.staff_signature ? '#065F46' : '#111',
            border: `1.5px solid ${a.staff_signature ? '#A7F3D0' : '#E4E2DE'}`,
            borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer',
          }}>
            {a.staff_signature ? '✍️ 서명 완료된 확인서 미리보기' : '📄 미리보기 (서명 전)'}
          </button>
        </Section>

        {/* 처리 이력 */}
        {reviewLog.length > 0 && (
          <Section title="처리 이력">
            {reviewLog.map(log => (
              <div key={log.id} style={{ padding: '6px 0', borderBottom: '1px solid #F0F0EC',
                                          fontSize: 11, color: '#666' }}>
                <span style={{ fontWeight: 700, color: '#111' }}>{actionLabel(log.action)}</span>
                {log.note && <span> · {log.note}</span>}
                <span style={{ marginLeft: 4, color: '#999' }}>
                  · {new Date(log.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </Section>
        )}
      </div>

      {/* 액션 버튼 (하단 고정) */}
      {!isFinalized && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
                       background: '#FFF', borderTop: '1px solid #E4E2DE',
                       padding: 12, zIndex: 20 }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 8 }}>
            <button onClick={() => setShowRejectModal(true)} disabled={busy} style={btnStyle('outline-red')}>
              ❌ 반려
            </button>
            <button onClick={() => setShowRequestDocs(true)} disabled={busy} style={btnStyle('outline-purple')}>
              📄 추가 서류
            </button>
            <button onClick={() => setShowSignPad(true)} disabled={busy} style={btnStyle('primary')}>
              ✍️ 서명하고 승인
            </button>
          </div>
        </div>
      )}

      {/* 서명 완료 후: 최종 승인 가능 */}
      {a.status === 'signed' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
                       background: '#FFF', borderTop: '1px solid #E4E2DE',
                       padding: 12, zIndex: 20 }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <button onClick={handleApprove} disabled={busy} style={{
              width: '100%', padding: 14, background: '#059669', color: '#FFF',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800, cursor: 'pointer'
            }}>
              ✅ 출입국 허가 후 최종 승인
            </button>
          </div>
        </div>
      )}

      {/* 서명 모달 */}
      {showSignPad && (
        <Modal onClose={() => setShowSignPad(false)} title="✍️ 담당자 서명">
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10, lineHeight: 1.6 }}>
            아래 박스에 서명해 주세요. 서명은 시간제취업확인서의 <strong>유학생담당자 확인란</strong>에 자동 삽입됩니다.
          </div>
          <SignaturePad
            onSave={handleSign}
            initialDataUrl={staff.default_signature || null}
          />
          {staff.default_signature && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#059669' }}>
              💡 이전 서명을 불러왔습니다. 그대로 사용하거나 다시 그릴 수 있습니다.
            </div>
          )}
        </Modal>
      )}

      {/* 추가 서류 요청 모달 */}
      {showRequestDocs && (
        <Modal onClose={() => setShowRequestDocs(false)} title="📄 추가 서류 요청">
          <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            학생에게 요청할 서류를 선택해 주세요.
          </div>
          {[
            { key: 'transcript', label: '성적증명서 (최신)' },
            { key: 'attendance', label: '출석확인서' },
            { key: 'topik_recent', label: 'TOPIK 최근 성적표' },
            { key: 'enrollment_recent', label: '재학증명서 (재발급)' },
            { key: 'other', label: '기타 서류' },
          ].map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 0', cursor: 'pointer' }}>
              <input type="checkbox"
                checked={requestedDocs.includes(opt.key)}
                onChange={(e) => {
                  if (e.target.checked) setRequestedDocs([...requestedDocs, opt.key]);
                  else setRequestedDocs(requestedDocs.filter(k => k !== opt.key));
                }} />
              <span style={{ fontSize: 13 }}>{opt.label}</span>
            </label>
          ))}
          <textarea
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder="추가 안내 (선택)"
            style={{ width: '100%', padding: 10, marginTop: 10, boxSizing: 'border-box',
                     border: '1px solid #E4E2DE', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
                     resize: 'vertical', minHeight: 60 }}
          />
          <button onClick={handleRequestDocs} disabled={busy || requestedDocs.length === 0} style={{
            width: '100%', padding: 12, marginTop: 12,
            background: '#9333EA', color: '#FFF', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>
            요청 발송
          </button>
        </Modal>
      )}

      {/* 반려 모달 */}
      {showRejectModal && (
        <Modal onClose={() => setShowRejectModal(false)} title="❌ 신청 반려">
          <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
            반려 사유를 학생에게 명확히 안내해 주세요.
          </div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="반려 사유 (예: TOPIK 급수 부족으로 허용 시간 초과)"
            style={{ width: '100%', padding: 10, boxSizing: 'border-box',
                     border: '1px solid #E4E2DE', borderRadius: 6, fontSize: 12, fontFamily: 'inherit',
                     resize: 'vertical', minHeight: 80 }}
          />
          <button onClick={handleReject} disabled={busy || !rejectReason.trim()} style={{
            width: '100%', padding: 12, marginTop: 12,
            background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: 'pointer',
          }}>
            반려 처리
          </button>
        </Modal>
      )}
    </div>
  );
}

// ───── 시간제취업확인서 HTML 생성 (담당자 서명 포함) ─────
function generateConfirmationFormHTML(app, staff, certified) {
  const workDays = Array.isArray(app.work_days) ? app.work_days
    : (typeof app.work_days === 'string' ? app.work_days.split(/[·,\s]/).filter(Boolean) : []);

  let hoursPerDay = 0;
  if (app.work_start_time && app.work_end_time) {
    const sP = String(app.work_start_time).split(':');
    const eP = String(app.work_end_time).split(':');
    let sH = parseInt(sP[0],10)||0, sM = parseInt(sP[1],10)||0;
    let eH = parseInt(eP[0],10)||0, eM = parseInt(eP[1],10)||0;
    if (eH < sH) eH += 24;
    hoursPerDay = (eH*60 + eM - sH*60 - sM) / 60;
  } else if (app.weekly_hours && workDays.length > 0) {
    hoursPerDay = app.weekly_hours / workDays.length;
  }

  const totalWeekday = Math.round(workDays.filter(d => ['월','화','수','목','금'].includes(d)).length * hoursPerDay * 10) / 10;
  const totalWeekend = Math.round(workDays.filter(d => ['토','일'].includes(d)).length * hoursPerDay * 10) / 10;

  const dayRow = ['월','화','수','목','금','토','일'].map(d => {
    const has = workDays.includes(d);
    return `<td style="text-align:center;padding:6px;border:1px solid #000;">${has ? hoursPerDay + 'h' : ''}</td>`;
  }).join('');

  const today = new Date();
  const courseLabel = ({lang:'어학연수', as:'전문학사', ug12:'학사 1~2학년', ug34:'학사 3~4학년', grad:'석박사'})[app.course] || '';
  const sig = app.staff_signature || staff?.default_signature;

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
.section-label { background: #d9d9d9 !important; font-weight: 800; text-align: center; }
.day-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
.day-table th, .day-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 10.5px; }
.day-table th { background: #f0f0f0; }
.statement { padding: 14px 4px; font-size: 11.5px; line-height: 1.8; margin: 16px 0 10px; }
.date-line { text-align: center; font-size: 12px; margin: 24px 0; letter-spacing: 4px; }
.target { font-weight: 700; text-align: center; padding: 16px 0 12px; border-bottom: 1px solid #000; margin-bottom: 12px; font-size: 12px; }
.officer-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
.officer-table td { border: 1px solid #000; padding: 8px 10px; font-size: 11px; }
.officer-table .label { background: #f0f0f0; font-weight: 700; width: 18%; text-align: center; }
.fill { color: #1e40af; font-weight: 700; }
.empty { color: #999; font-style: italic; }
.signature-img { max-height: 40px; max-width: 120px; }
.print-btn { position: fixed; top: 8px; right: 8px; padding: 8px 14px; background: #00B37E; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
@media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="window.print()">🖨 인쇄 / PDF로 저장</button>
<div class="subtitle">붙임 4-1 외국인 유학생 시간제 취업 확인서(한글) - 대학 작성</div>
<h1>외국인 유학생 시간제 취업 확인서</h1>

<table class="form">
<tr><th rowspan="3" class="section-label">대상자</th>
<th>성 명</th><td class="fill">${app.worker_name || ''}</td>
<th>외국인<br>등록번호</th><td class="fill">${app.alien_reg_number || '(외국인등록증 기재)'}</td></tr>
<tr><th>학과(전공)</th><td class="fill">${app.university_name || ''}</td>
<th>이수학기</th><td class="fill">${courseLabel}</td></tr>
<tr><th>전화번호</th><td class="fill">${app.phone || '(연락처 기재)'}</td>
<th>e-mail</th><td class="fill">${app.email || '(이메일 기재)'}</td></tr>
</table>

<table class="form">
<tr><th rowspan="6" class="section-label">취업<br>예정<br>근무처</th>
<th>업체명</th><td colspan="3" class="fill">${app.employer_name || ''}</td></tr>
<tr><th>사업자<br>등록번호</th><td class="fill">${app.employer_business_no || ''}</td>
<th>업종</th><td class="fill">${app.position || ''}</td></tr>
<tr><th>주 소</th><td colspan="3" class="fill">${app.work_address || ''}</td></tr>
<tr><th>고용주</th><td class="fill">${app.employer_name || ''} (인 또는 서명)</td>
<th>전화번호</th><td class="empty">(고용주 연락처)</td></tr>
<tr><th>취업기간</th><td class="fill">${app.contract_start || ''} ~ ${app.contract_end || ''}</td>
<th>급여(시급)</th><td class="fill">${app.hourly_pay ? Number(app.hourly_pay).toLocaleString() + '원' : ''}</td></tr>
<tr><th>근무시간</th><td colspan="3">
<div style="margin-bottom:6px;font-size:10.5px;">평일: 총 <span class="fill">${totalWeekday}</span>시간 &nbsp;&nbsp; 주말: 총 <span class="fill">${totalWeekend}</span>시간</div>
<table class="day-table">
<tr><th>요일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th></tr>
<tr><th>시간</th>${dayRow}</tr></table>
</td></tr>
</table>

<div class="statement">
위 유학생은 본교에 재학하고 있는 학생으로서 현재의 학습 및 연구 상황으로 볼 때, 상기 예정된 시간제취업 활동을 통해서는 학업(또는 연구 활동)에 지장이 없을 것으로 판단되므로, 이에 확인합니다.
</div>

<div class="date-line">${today.getFullYear()}. &nbsp;&nbsp; ${today.getMonth()+1}. &nbsp;&nbsp; ${today.getDate()}.</div>

<div class="target">◌ ◌ 출입국 · 외국인청(사무소 · 출장소)장 귀하</div>

<table class="officer-table">
<tr>
<td class="label" rowspan="3">유학생<br>담당자<br>확인란</td>
<td class="label">소속</td><td class="fill">${staff?.university?.name || ''}</td>
<td class="label">인증대학<br>여부</td><td>
<span style="display:inline-block;width:14px;height:14px;border:1px solid #000;text-align:center;line-height:12px;font-size:11px;vertical-align:middle;">${certified ? '✓' : ''}</span> 해당 &nbsp;&nbsp;&nbsp;
<span style="display:inline-block;width:14px;height:14px;border:1px solid #000;text-align:center;line-height:12px;font-size:11px;vertical-align:middle;">${!certified ? '✓' : ''}</span> 비해당
</td>
</tr>
<tr>
<td class="label">성명</td><td class="fill">
${staff?.staff_name || ''} ${sig ? `<img src="${sig}" class="signature-img" alt="서명" style="vertical-align:middle;margin-left:8px;">` : '(인 또는 서명)'}
</td>
<td class="label">직위<br>(연락처)</td><td class="fill">${staff?.staff_position || ''}${staff?.staff_phone ? ' / ' + staff.staff_phone : ''}</td>
</tr>
</table>
</body></html>`;
}

// ───── UI 헬퍼 ─────
function Section({ title, children }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
                  border: '1px solid #E4E2DE' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
                    letterSpacing: '0.05em', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '6px 0', borderBottom: '1px solid #F0F0EC' }}>
      <div style={{ width: 100, fontSize: 11, color: '#888' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12, color: '#111', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFF', borderRadius: 12, padding: 20,
        maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function btnStyle(variant) {
  if (variant === 'primary') return {
    flex: 2, padding: 12, background: '#111', color: '#FFF',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer',
  };
  if (variant === 'outline-red') return {
    flex: 1, padding: 12, background: '#FFF', color: '#DC2626',
    border: '1.5px solid #DC2626', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
  if (variant === 'outline-purple') return {
    flex: 1, padding: 12, background: '#FFF', color: '#9333EA',
    border: '1.5px solid #9333EA', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
}

function courseLabel(course) {
  return ({ lang:'어학연수', as:'전문학사', ug12:'학부 1~2', ug34:'학부 3~4', grad:'석박사' })[course] || course;
}

function actionLabel(action) {
  return ({
    opened:        '👀 검토 시작',
    requested_docs:'📄 추가 서류 요청',
    signed:        '✍️ 서명 완료',
    approved:      '✅ 승인',
    rejected:      '❌ 반려',
    commented:     '💬 메모',
  })[action] || action;
}
