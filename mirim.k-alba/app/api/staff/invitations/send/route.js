/**
 * POST /api/staff/invitations/send
 *
 * 담당자 초대 이메일 발송 (Resend 사용).
 * Body:
 *   - invitation_id: UUID
 *   - email: 받는 사람 이메일
 *   - staff_name: 받는 사람 이름
 *   - university_name: 대학 이름
 *   - inviter_name: 초대한 사람 이름
 *   - invite_url: 수락 URL
 */
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      invitation_id,
      email,
      staff_name,
      university_name,
      inviter_name,
      invite_url,
    } = body;

    if (!email || !invite_url) {
      return NextResponse.json(
        { ok: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      // 개발 환경에서는 환경변수 없이도 동작하도록 mock 처리
      console.warn('[invite/send] RESEND_API_KEY 없음 — 이메일 발송 스킵');
      return NextResponse.json({
        ok: true,
        _mock: true,
        message: '개발 모드 (RESEND_API_KEY 미설정) — 초대 URL을 직접 공유해 주세요',
        invite_url,
      });
    }

    const subject = `[K-ALBA] ${university_name} 국제처 담당자 초대`;
    const htmlBody = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, 'Pretendard', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <div style="background: #F5F5F0; padding: 32px; border-radius: 12px;">
    <h1 style="font-size: 22px; margin: 0 0 8px;">👥 담당자 초대</h1>
    <p style="font-size: 13px; color: #666; margin: 0 0 24px;">K-ALBA 외국인 유학생 시간제취업 신청 시스템</p>

    <p style="font-size: 14px; line-height: 1.7;">
      안녕하세요, <strong>${staff_name || email}</strong>님.<br>
      <strong>${inviter_name}</strong>님이 <strong>${university_name}</strong>의
      국제처 담당자로 초대했습니다.
    </p>

    <p style="font-size: 14px; line-height: 1.7;">
      초대를 수락하시면 외국인 유학생들의 시간제취업 신청서를 검토하고,
      시간제취업확인서에 디지털 서명을 할 수 있습니다.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${invite_url}" style="display: inline-block; padding: 14px 32px; background: #111; color: #FFF; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
        초대 수락하기 →
      </a>
    </div>

    <div style="background: #FEF3C7; padding: 12px; border-radius: 8px; font-size: 12px; color: #92400E; line-height: 1.6;">
      ⏰ 이 초대 링크는 <strong>7일</strong> 동안만 유효합니다.<br>
      초대를 받지 않으시려면 이 메일을 무시해 주세요.
    </div>

    <hr style="border: none; border-top: 1px solid #E4E2DE; margin: 24px 0;">

    <p style="font-size: 11px; color: #888; line-height: 1.6;">
      문의: support@k-alba.kr<br>
      미림미디어랩 주식회사
    </p>
  </div>
</body></html>`.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'K-ALBA <noreply@k-alba.kr>',
        to: [email],
        subject,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[invite/send] Resend 실패:', res.status, errText);
      return NextResponse.json(
        { ok: false, error: '이메일 발송 실패', details: errText },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, message_id: data.id, invitation_id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
