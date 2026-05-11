"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { getCurrentUser, supabase } from "@/lib/supabase";
import { Button, Badge, Empty, PageLoading, ButtonLoading } from "@/components/ui";

/**
 * /staff/partwork/invite 담당자 초대 (BI v2)
 *
 * 페르소나: 학교 관리자 (manager/admin) — Editorial 골드 톤
 *
 * 변경점 (BI v2):
 *   - 인라인 hex → T 토큰
 *   - 권한 없음 → Empty variant="error"
 *   - 로딩 → PageLoading
 *   - 초대 상태 → Badge 시맨틱 (used=success, expired=error, pending=warning)
 *   - 발송 버튼 → Button + ButtonLoading
 *   - 철회 버튼 → Button variant="ghost"
 *   - Editorial 골드 헤더
 *
 * 보존:
 *   - 학교 도메인 검증 흐름
 *   - 본인 초대 방지
 *   - role 선택 (reviewer/manager/admin) — admin만 상위 권한 부여 가능
 *   - 초대 토큰 + 이메일 발송 (Supabase)
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
          email: email,
          staff_name: form.staff_name.trim(),
          staff_position: form.staff_position.trim() || null,
          role: form.role,
          invited_by: user.id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 이메일 발송 (비동기)
      fetch('/api/staff/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: data.id }),
      }).catch(() => {});

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

  if (loading) return <PageLoading message="로딩 중..." minHeight={400} />;

  if (!staff) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
        <Empty
          variant="error"
          icon="🔒"
          title="관리자 권한이 필요합니다"
          description="담당자 초대는 manager 또는 admin 역할을 가진 사용자만 가능합니다."
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
            <Link href="/staff/partwork/profile" style={{ color: T.ink, fontSize: 18, textDecoration: 'none' }}>←</Link>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, color: T.ink3, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                STAFF · 담당자 초대
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginTop: 2 }}>
                👥 담당자 초대
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
        <div style={{
          background: T.paper, borderRadius: 12, padding: 16, marginBottom: 12,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, marginBottom: 4 }}>
            대학
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>{staff.university?.name}</div>
        </div>

        {/* 초대 폼 */}
        <div style={{
          background: T.paper, borderRadius: 12, padding: 16, marginBottom: 12,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: 'uppercase',
            letterSpacing: '0.05em', marginBottom: 10,
          }}>
            새 담당자 초대
          </div>

          {/* 학교 도메인 안내 (info — 파랑 보존) */}
          {staff.university?.allowed_email_domains?.length > 0 && (
            <div style={{
              background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6,
              padding: 10, marginBottom: 12, fontSize: 11, color: '#1E40AF',
              lineHeight: 1.6,
            }}>
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
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleInvite}
            disabled={sending}
            style={{ marginTop: 10 }}
          >
            {sending ? <ButtonLoading text="발송 중..." /> : "📨 초대 이메일 발송"}
          </Button>
        </div>

        {/* 발송된 초대 목록 */}
        {invitations.length > 0 && (
          <div style={{
            background: T.paper, borderRadius: 12, padding: 16,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: 'uppercase',
              letterSpacing: '0.05em', marginBottom: 10,
            }}>
              최근 초대 ({invitations.length})
            </div>
            {invitations.map(inv => {
              const expired = new Date(inv.expires_at) < new Date();
              const status = inv.used ? 'used' : expired ? 'expired' : 'pending';
              const variant = inv.used ? 'success' : expired ? 'error' : 'warning';
              const label = inv.used ? '✓ 가입 완료' : expired ? '만료됨' : '대기 중';
              return (
                <div key={inv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: `1px solid ${T.border}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                      {inv.staff_name}{' '}
                      <span style={{ color: T.ink3, fontWeight: 500 }}>({inv.email})</span>
                    </div>
                    <div style={{
                      fontSize: 10, color: T.ink2, marginTop: 4,
                      display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                    }}>
                      <span>{inv.staff_position || '-'} · {roleLabel(inv.role)}</span>
                      <Badge variant={variant} size="sm">{label}</Badge>
                    </div>
                  </div>
                  {!inv.used && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(inv.id)}
                      style={{ color: '#DC2626', border: '1px solid #DC2626' }}
                    >
                      철회
                    </Button>
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

function roleLabel(role) {
  return ({ reviewer: '검토자', manager: '관리자', admin: '대학 관리자' })[role] || role;
}
