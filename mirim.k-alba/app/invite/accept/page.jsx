"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, supabase } from "@/lib/supabase";

/**
 * /invite/accept?token=... — 담당자 초대 수락
 *
 * 초대 토큰을 검증하고 university_staff에 등록.
 * 미로그인 시 → 로그인 후 자동 복귀
 * 로그인 시 → 초대 정보 표시 → "수락" 버튼 → staff 등록
 */
function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [user, setUser] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('유효하지 않은 초대 링크입니다');
      setLoading(false);
      return;
    }
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      // 초대 검증
      const { data: inv, error: invErr } = await supabase
        .from('staff_invitations')
        .select('*, university:universities(*)')
        .eq('invitation_token', token)
        .single();

      if (invErr || !inv) {
        setError('초대 정보를 찾을 수 없습니다 (이미 사용되었거나 잘못된 링크)');
        setLoading(false);
        return;
      }
      if (inv.used) {
        setError('이미 사용된 초대 링크입니다');
        setLoading(false);
        return;
      }
      if (new Date(inv.expires_at) < new Date()) {
        setError('만료된 초대 링크입니다 (7일 경과)');
        setLoading(false);
        return;
      }
      setInvitation(inv);
      setUniversity(inv.university);
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?redirect=/invite/accept?token=${token}`);
      return;
    }
    if (user.email !== invitation.email) {
      const ok = confirm(`초대 이메일(${invitation.email})과 로그인 이메일(${user.email})이 다릅니다.\n그래도 계속하시겠습니까?`);
      if (!ok) return;
    }

    setAccepting(true);
    try {
      // 1. university_staff에 등록
      const { error: staffErr } = await supabase
        .from('university_staff')
        .insert({
          user_id:        user.id,
          university_id:  invitation.university_id,
          staff_name:     invitation.staff_name,
          staff_position: invitation.staff_position,
          staff_email:    user.email,
          role:           invitation.role,
          invited_by:     invitation.invited_by,
          invitation_status: 'accepted',
          accepted_at:    new Date().toISOString(),
          is_active:      true,
        });

      if (staffErr) {
        if (staffErr.code === '23505') { // unique violation
          alert('이미 이 대학의 담당자로 등록되어 있습니다.');
          router.push('/staff/partwork');
          return;
        }
        throw staffErr;
      }

      // 2. 초대를 used로 표시
      await supabase
        .from('staff_invitations')
        .update({ used: true, used_at: new Date().toISOString() })
        .eq('id', invitation.id);

      alert('✅ 담당자 등록이 완료되었습니다!');
      router.push('/staff/partwork/profile');
    } catch (e) {
      alert('등록 실패: ' + e.message);
      setAccepting(false);
    }
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>⏳ 로딩...</div>;

  if (error) {
    return (
      <div style={{ padding: 40, maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#FEF2F2', padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontWeight: 800, color: '#991B1B', marginTop: 12 }}>{error}</div>
          <Link href="/" style={{ display: 'inline-block', marginTop: 16,
            padding: '10px 20px', background: '#111', color: '#FFF', borderRadius: 8,
            textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>홈으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#FFF', borderRadius: 16, padding: 32,
                    maxWidth: 500, width: '100%',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40 }}>👥</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', marginTop: 8,
                        textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            STAFF INVITATION
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginTop: 4 }}>
            국제처 담당자 초대
          </div>
        </div>

        <div style={{ background: '#F5F5F0', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Field label="대학">{university?.name}</Field>
          <Field label="이메일">{invitation.email}</Field>
          <Field label="성명">{invitation.staff_name}</Field>
          {invitation.staff_position && <Field label="직위">{invitation.staff_position}</Field>}
          <Field label="역할">{roleLabel(invitation.role)}</Field>
        </div>

        {!user ? (
          <>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.7 }}>
              초대를 수락하려면 먼저 로그인해 주세요. 로그인 후 자동으로 이 페이지로 돌아옵니다.
            </div>
            <Link href={`/login?redirect=/invite/accept?token=${token}`} style={{
              display: 'block', width: '100%', padding: 12,
              background: '#111', color: '#FFF', textAlign: 'center',
              borderRadius: 8, textDecoration: 'none',
              fontSize: 13, fontWeight: 800,
            }}>
              로그인하기 →
            </Link>
          </>
        ) : (
          <button onClick={handleAccept} disabled={accepting} style={{
            width: '100%', padding: 14,
            background: accepting ? '#999' : '#059669', color: '#FFF',
            border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 800,
            cursor: accepting ? 'not-allowed' : 'pointer',
          }}>
            {accepting ? '처리 중...' : '✅ 초대 수락하기'}
          </button>
        )}

        <div style={{ fontSize: 10, color: '#888', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
          이 초대는 {new Date(invitation.expires_at).toLocaleDateString('ko-KR')} 까지 유효합니다
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', padding: '4px 0' }}>
      <div style={{ width: 70, fontSize: 11, color: '#888' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#111' }}>{children}</div>
    </div>
  );
}

function roleLabel(role) {
  return ({ reviewer: '검토자', manager: '관리자', admin: '대학 관리자' })[role] || role;
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>⏳ 로딩...</div>}>
      <InviteAcceptContent />
    </Suspense>
  );
}
