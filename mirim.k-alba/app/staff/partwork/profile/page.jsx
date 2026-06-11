"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, supabase } from "@/lib/supabase";
import SignaturePad from "@/components/SignaturePad";
import { Button, Badge, Empty, PageLoading, ButtonLoading } from "@/components/ui";

/**
 * /staff/partwork/profile 담당자 본인 정보 + 서명 (BI v2)
 *
 * 페르소나: 학교 담당자 — Editorial 골드 톤
 *
 * 변경점 (BI v2):
 *   - 인라인 hex → T 토큰
 *   - 권한 없음 → Empty variant="error"
 *   - 로딩 → PageLoading
 *   - 인증 배지 → Badge variant="success" (IEQAS 인증대학)
 *   - 저장 버튼 → Button + ButtonLoading
 *   - 서명 등록/다시 그리기 → Button (시맨틱)
 *   - Editorial 골드 헤더
 *
 * 보존:
 *   - 다중 대학 전환
 *   - SignaturePad 모달
 *   - 기본 서명 자동 적용 흐름
 *   - 담당자 초대 링크 (manager/admin만)
 */
export default function StaffProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [staffRecords, setStaffRecords] = useState([]);
  const [activeStaff, setActiveStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [form, setForm] = useState({
    staff_name: '', staff_position: '', staff_phone: '',
    staff_email: '', department: '국제처',
  });

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.push('/login?redirect=/staff/partwork/profile'); return; }
      setUser(u);

      const { data } = await supabase
        .from('university_staff')
        .select('*, university:universities(*)')
        .eq('user_id', u.id)
        .eq('is_active', true)
        .order('created_at');

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }
      setStaffRecords(data);
      setActiveStaff(data[0]);
      setForm({
        staff_name:     data[0].staff_name     || '',
        staff_position: data[0].staff_position || '',
        staff_phone:    data[0].staff_phone    || '',
        staff_email:    data[0].staff_email    || u.email || '',
        department:     data[0].department     || '국제처',
      });
      setLoading(false);
    })();
  }, []);

  const switchStaff = (s) => {
    setActiveStaff(s);
    setForm({
      staff_name:     s.staff_name     || '',
      staff_position: s.staff_position || '',
      staff_phone:    s.staff_phone    || '',
      staff_email:    s.staff_email    || user?.email || '',
      department:     s.department     || '국제처',
    });
  };

  const handleSave = async () => {
    if (!activeStaff) return;
    if (!form.staff_name.trim()) { alert('성명을 입력해 주세요'); return; }

    setSaving(true);
    const { error } = await supabase
      .from('university_staff')
      .update({
        staff_name:     form.staff_name,
        staff_position: form.staff_position || null,
        staff_phone:    form.staff_phone    || null,
        staff_email:    form.staff_email    || null,
        department:     form.department     || '국제처',
      })
      .eq('id', activeStaff.id);

    setSaving(false);
    if (error) {
      alert('저장 실패: ' + error.message);
    } else {
      const updated = { ...activeStaff, ...form };
      setActiveStaff(updated);
      setStaffRecords(staffRecords.map(s => s.id === activeStaff.id ? updated : s));
      alert('✅ 저장되었습니다');
    }
  };

  const handleSaveSignature = async (signatureDataUrl) => {
    if (!activeStaff) return;
    setSaving(true);
    const { error } = await supabase
      .from('university_staff')
      .update({
        default_signature: signatureDataUrl,
        signature_updated_at: new Date().toISOString(),
      })
      .eq('id', activeStaff.id);

    if (error) {
      alert('서명 저장 실패: ' + error.message);
    } else {
      const updated = { ...activeStaff, default_signature: signatureDataUrl };
      setActiveStaff(updated);
      setStaffRecords(staffRecords.map(s => s.id === activeStaff.id ? updated : s));
      setShowSignPad(false);
      alert('✅ 기본 서명이 저장되었습니다. 이후 신청서 검토 시 자동으로 사용됩니다.');
    }
    setSaving(false);
  };

  if (loading) return <PageLoading message="로딩 중..." minHeight={400} />;

  if (!activeStaff) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        <Empty
          variant="error"
          icon="🔒"
          title="담당자 권한이 없습니다"
          action={
            <Button variant="primary" href="/staff/partwork">← 포털로</Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, paddingBottom: 40 }}>
      {/* Editorial 헤더 + 골드 라인 */}
      <div style={{ background: T.paper, borderBottom: `1px solid ${T.border}`, padding: '12px 16px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 40, height: 3, background: T.gold, marginBottom: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/staff/partwork" style={{ color: T.ink, fontSize: 18, textDecoration: 'none' }}>←</Link>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, color: T.ink3, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                STAFF · 담당자 설정
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginTop: 2 }}>
                ⚙️ 담당자 설정
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
        {/* 다중 대학 전환 */}
        {staffRecords.length > 1 && (
          <div style={{
            background: T.paper, borderRadius: 12, padding: 14, marginBottom: 12,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, marginBottom: 8 }}>
              담당 대학 ({staffRecords.length}개)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {staffRecords.map(s => (
                <button key={s.id} onClick={() => switchStaff(s)} style={{
                  padding: '6px 12px', borderRadius: 999,
                  background: activeStaff.id === s.id ? T.ink : T.paper,
                  color: activeStaff.id === s.id ? T.paper : T.ink,
                  border: `1.5px solid ${T.ink}`,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {s.university?.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 대학 정보 */}
        <Section title="소속 대학">
          <div style={{ padding: '8px 0' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {activeStaff.university?.name}
              {activeStaff.university?.certified && (
                <Badge variant="success" size="sm">IEQAS 인증대학</Badge>
              )}
            </div>
            <div style={{ fontSize: 11, color: T.ink2, marginTop: 4 }}>
              역할: <strong>{roleLabel(activeStaff.role)}</strong>
              {activeStaff.role === 'reviewer' && ' · 검토·서명만 가능'}
              {activeStaff.role === 'manager' && ' · 다른 담당자 초대 가능'}
              {activeStaff.role === 'admin'   && ' · 대학 설정 변경 가능'}
            </div>
          </div>
        </Section>

        {/* 본인 정보 */}
        <Section title="본인 정보 (시간제취업확인서에 표시됨)">
          <FormField label="성명" required>
            <input type="text" value={form.staff_name}
              onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
              placeholder="홍길동" style={inputStyle} />
          </FormField>
          <FormField label="직위">
            <input type="text" value={form.staff_position}
              onChange={(e) => setForm({ ...form, staff_position: e.target.value })}
              placeholder="유학생지원팀장 / Korean Coordinator" style={inputStyle} />
          </FormField>
          <FormField label="소속">
            <input type="text" value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="국제처 / Office of International Affairs" style={inputStyle} />
          </FormField>
          <FormField label="연락처">
            <input type="tel" value={form.staff_phone}
              onChange={(e) => setForm({ ...form, staff_phone: e.target.value })}
              placeholder="02-1234-5678" style={inputStyle} />
          </FormField>
          <FormField label="업무 이메일">
            <input type="email" value={form.staff_email}
              onChange={(e) => setForm({ ...form, staff_email: e.target.value })}
              placeholder="oia@university.ac.kr" style={inputStyle} />
          </FormField>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop: 14 }}
          >
            {saving ? <ButtonLoading text="저장 중..." /> : "저장"}
          </Button>
        </Section>

        {/* 기본 서명 */}
        <Section title="기본 서명">
          <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.7, marginBottom: 12 }}>
            기본 서명을 등록해 두면 신청서 검토 시 자동으로 불러와 즉시 사용할 수 있습니다.
            서명은 시간제취업확인서의 <strong>유학생담당자 확인란</strong>에 자동 삽입됩니다.
          </div>
          {activeStaff.default_signature ? (
            <div style={{
              padding: 14, background: '#F0FDF4', border: '1px solid #A7F3D0',
              borderRadius: 8, textAlign: 'center',
            }}>
              <img src={activeStaff.default_signature} alt="현재 서명"
                style={{ maxHeight: 80, maxWidth: '100%', background: T.paper,
                         padding: 8, borderRadius: 4 }} />
              <div style={{ fontSize: 10, color: '#059669', marginTop: 8, fontWeight: 700 }}>
                ✓ 기본 서명 등록됨 · {activeStaff.signature_updated_at
                  ? new Date(activeStaff.signature_updated_at).toLocaleDateString('ko-KR')
                  : ''}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignPad(true)}
                style={{ marginTop: 10, color: '#059669', border: '1.5px solid #059669' }}
              >
                ✏️ 다시 그리기
              </Button>
            </div>
          ) : (
            <button onClick={() => setShowSignPad(true)} style={{
              width: '100%', padding: 16,
              background: T.paper, color: T.ink,
              border: `2px dashed ${T.borderStrong}`, borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ✍️ 기본 서명 등록하기
            </button>
          )}
        </Section>

        {/* 서명 모달 */}
        {showSignPad && (
          <Modal onClose={() => setShowSignPad(false)} title="✍️ 기본 서명">
            <SignaturePad
              onSave={handleSaveSignature}
              initialDataUrl={activeStaff.default_signature || null}
            />
            <div style={{ fontSize: 10, color: T.ink2, marginTop: 8, lineHeight: 1.6 }}>
              이 서명은 향후 모든 신청서에 자동으로 사용됩니다. 매번 그릴 필요가 없습니다.
            </div>
          </Modal>
        )}

        {/* 담당자 초대 (manager/admin만) */}
        {['manager', 'admin'].includes(activeStaff.role) && (
          <Section title="담당자 관리">
            <Link href="/staff/partwork/invite" style={{
              display: 'block', padding: '12px 14px', background: '#EFF6FF',
              border: '1px solid #BFDBFE', borderRadius: 8, textDecoration: 'none',
              color: '#1E40AF', fontSize: 12, fontWeight: 700, textAlign: 'center',
            }}>
              👥 다른 담당자 초대하기 →
            </Link>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{
      background: T.paper, borderRadius: 12, padding: 16, marginBottom: 12,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: 'uppercase',
        letterSpacing: '0.05em', marginBottom: 10,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink, marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  border: `1px solid #E4E2DE`, borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', background: '#FFF',
};

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#FFF', borderRadius: 12, padding: 20,
        maxWidth: 500, width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 800, color: '#111' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888'
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function roleLabel(role) {
  return ({ reviewer: '검토자', manager: '관리자', admin: '대학 관리자' })[role] || role;
}
