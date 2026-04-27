"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/supabase";

/**
 * /staff/partwork/invite — 담당자 초대 (manager 이상)
 *
 * 같은 대학에 다른 담당자를 초대.
 * 초대 토큰 생성 → 이메일 발송 → 토큰으로 가입 → university_staff에 등록.
 */
export default function StaffInvitePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({
    email: '', staff_name: '', staff_position: '', role: 'reviewer',
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const { data } = await supabase
        .from('university_staff')
        .select('*, university:universities(*)')
        .eq('user_id', u.id)
        .eq('is_active', true)
        .in('role', ['manager', 'admin'])
        .limit(1)
        .single();

      if (!data) {
        setLoading(false);
        return;
      }
      setStaff(data);

      const { data: invs } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('university_id', data.university_id)
        .order('created_at', { ascending: false });
      setInvitations(invs || []);
      setLoading(false);
    })();
  }, []);

  const handleInvite = async () => {
    if (!form.email.trim() || !form.staff_name.trim()) {
      alert('이메일과 성명을 입력해 주세요');
      return;
    }

    // 학교 도메인 검증
    const email = form.email.trim().toLowerCase();
    const domain = email.split('@')[1];
    const allowedDomains = staff?.university?.allowed_email_domains || [];

    if (allowedDomains.length === 0) {
      const ok = confirm(
        '⚠️ 이 대학의 학교 도메인이 아직 등록되지 않았습니다.\n' +
        '도메인 검증 없이 초대를 보내면 보안 위험이 있습니다.\n' +
        '운영팀(support@k-alba.kr)에 학교 공식 도메인 등록을 요청하는 것을 권장합니다.\n\n' +
        '그래도 진행하시겠습니까?'
      );
      if (!ok) return;
    } else {
      const matched = allowedDomains.some(d => domain === d || domain?.endsWith('.' + d));
      if (!matched) {
        alert(
          '❌ 학교 공식 이메일 도메인이 아닙니다.\n\n' +
          `입력한 도메인: @${domain}\n` +
          `허용 도메인: @${allowedDomains.join(', @')}\n\n` +
          '학교 공식 이메일을 사용해야 보안상 안전하게 초대할 수 있습니다.'
        );
        return;
      }
    }

    // 본인 자신 초대 방지
    if (email === user.email?.toLowerCase()) {
      alert('본인 자신은 초대할 수 없습니다.');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .insert({
          university_id: staff.university_id,
          email:          email,
          staff_name:     form.staff_name.trim(),
          staff_position: form.staff_position.trim() || null,
          role:           form.role,
          invited_by:     user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 이메일 발송 API 호출 (실제 구현은 별도 라우트)
      const inviteUrl = `${window.location.origin}/invite/accept?token=${data.invitation_token}`;
      const res = await fetch('/api/staff/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: data.id,
          email: data.email,
          staff_name: data.staff_name,
          university_name: staff.university.name,
          inviter_name: staff.staff_name,
          invite_url: inviteUrl,
        }),
      });
      // 이메일 발송 실패해도 초대 자체는 생성됨 (수동 URL 공유 가능)
      if (!res.ok) {
        alert(`✅ 초대가 생성되었습니다.\n\n이메일 발송에 실패했으니 아래 링크를 직접 전달해 주세요:\n${inviteUrl}`);
      } else {
        alert(`✅ ${form.email} 으로 초대 이메일이 발송되었습니다.`);
      }

      setInvitations([data, ...invitations]);
      setForm({ email: '', staff_name: '', staff_position: '', role: 'reviewer' });
    } catch (e) {
      alert('초대 실패: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('이 초대를 철회할까요?')) return;
    const { error } = await supabase
      .from('staff_invitations')
      .delete()
      .eq('id', id);
    if (!error) {
      setInvitations(invitations.filter(i => i.id !== id));
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ 로딩...</div>;

  if (!staff) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#FEF2F2', padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontWeight: 800, color: '#991B1B', marginTop: 12 }}>
            관리자 권한이 필요합니다
          </div>
          <div style={{ fontSize: 12, color: '#7F1D1D', marginTop: 6, lineHeight: 1.7 }}>
            담당자 초대는 manager 또는 admin 역할을 가진 사용자만 가능합니다.
          </div>
          <Link href="/staff/partwork" style={{ display: 'inline-block', marginTop: 16,
            padding: '10px 20px', background: '#111', color: '#FFF', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← 포털로</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 40 }}>
      <div style={{ background: '#FFF', borderBottom: '1px solid #E4E2DE', padding: '12px 16px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/staff/partwork/profile" style={{ color: '#111', fontSize: 18, textDecoration: 'none' }}>←</Link>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>👥 담당자 초대</div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
        <div style={{ background: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
                       border: '1px solid #E4E2DE' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginBottom: 4 }}>
            대학
          </div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{staff.university?.name}</div>
        </div>

        {/* 초대 폼 */}
        <div style={{ background: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
                       border: '1px solid #E4E2DE' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
                         letterSpacing: '0.05em', marginBottom: 10 }}>
            새 담당자 초대
          </div>

          {/* 학교 도메인 안내 */}
          {staff.university?.allowed_email_domains?.length > 0 && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6,
                           padding: 10, marginBottom: 12, fontSize: 11, color: '#1E40AF',
                           lineHeight: 1.6 }}>
              🔒 <strong>학교 공식 이메일만 초대 가능</strong><br/>
              허용 도메인: <strong>@{staff.university.allowed_email_domains.join(', @')}</strong>
            </div>
          )}

          <FormField label="이메일" required>
            <input type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={
                staff.university?.allowed_email_domains?.[0]
                  ? `staff@${staff.university.allowed_email_domains[0]}`
                  : 'staff@university.ac.kr'
              }
              style={inputStyle} />
          </FormField>
          <FormField label="성명" required>
            <input type="text" value={form.staff_name}
              onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
              placeholder="김영희" style={inputStyle} />
          </FormField>
          <FormField label="직위">
            <input type="text" value={form.staff_position}
              onChange={(e) => setForm({ ...form, staff_position: e.target.value })}
              placeholder="국제교류팀 직원" style={inputStyle} />
          </FormField>
          <FormField label="역할">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              style={inputStyle}>
              <option value="reviewer">검토자 (검토·서명만)</option>
              {staff.role === 'admin' && (
                <>
                  <option value="manager">관리자 (담당자 초대 가능)</option>
                  <option value="admin">대학 관리자 (전체 권한)</option>
                </>
              )}
            </select>
          </FormField>
          <button onClick={handleInvite} disabled={sending} style={{
            width: '100%', padding: 12, marginTop: 10,
            background: sending ? '#999' : '#111', color: '#FFF',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800,
            cursor: sending ? 'not-allowed' : 'pointer',
          }}>
            {sending ? '발송 중...' : '📨 초대 이메일 발송'}
          </button>
        </div>

        {/* 발송된 초대 목록 */}
        {invitations.length > 0 && (
          <div style={{ background: '#FFF', borderRadius: 12, padding: 16,
                         border: '1px solid #E4E2DE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
                           letterSpacing: '0.05em', marginBottom: 10 }}>
              최근 초대 ({invitations.length})
            </div>
            {invitations.map(inv => {
              const expired = new Date(inv.expires_at) < new Date();
              return (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid #F0F0EC',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {inv.staff_name} <span style={{ color: '#888', fontWeight: 500 }}>({inv.email})</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                      {inv.staff_position || '-'} · {roleLabel(inv.role)}
                      {' · '}
                      {inv.used ? <span style={{ color: '#059669' }}>✓ 가입 완료</span>
                        : expired ? <span style={{ color: '#DC2626' }}>만료됨</span>
                        : <span style={{ color: '#92400E' }}>대기 중</span>}
                    </div>
                  </div>
                  {!inv.used && (
                    <button onClick={() => handleRevoke(inv.id)} style={{
                      padding: '6px 10px', background: '#FFF', color: '#DC2626',
                      border: '1px solid #DC2626', borderRadius: 6,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    }}>
                      철회
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#444', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
      </div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  border: '1px solid #E4E2DE', borderRadius: 6,
  fontSize: 13, fontFamily: 'inherit', background: '#FFF',
};

function roleLabel(role) {
  return ({ reviewer: '검토자', manager: '관리자', admin: '대학 관리자' })[role] || role;
}
