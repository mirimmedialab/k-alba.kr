// 카카오 알림톡 발송 (NAVER Cloud SENS BizMessage)
// 서버 전용 모듈 — API 라우트에서만 import할 것
//
// 필요 환경변수 (모두 설정돼야 발송, 없으면 조용히 skip):
//   NCP_SENS_ACCESS_KEY          NAVER Cloud API 인증키 (Access Key)
//   NCP_SENS_SECRET_KEY          NAVER Cloud API 인증키 (Secret Key)
//   NCP_SENS_ALIMTALK_SERVICE_ID SENS 알림톡 서비스 ID
//   KAKAO_CHANNEL_ID             카카오톡 채널 ID (예: @k-alba)
//
// 템플릿 코드는 이벤트별 환경변수로 주입 (ALIMTALK_TPL_*)
// ※ 알림톡은 사전 심사된 템플릿과 내용이 일치해야 발송됩니다.

import crypto from "crypto";

const SENS_HOST = "https://sens.apigw.ntruss.com";

export function alimtalkConfigured() {
  return !!(
    process.env.NCP_SENS_ACCESS_KEY &&
    process.env.NCP_SENS_SECRET_KEY &&
    process.env.NCP_SENS_ALIMTALK_SERVICE_ID &&
    process.env.KAKAO_CHANNEL_ID
  );
}

/**
 * 알림톡 1건 발송
 * @param {{ to: string, templateCode: string, content: string, buttons?: Array }} params
 *   buttons 예: [{ type: "WL", name: "계약서 확인", linkMobile: url, linkPc: url }]
 * @returns {{ ok: boolean, skipped?: boolean, status?: number, data?: object }}
 */
export async function sendAlimtalk({ to, templateCode, content, buttons }) {
  if (!alimtalkConfigured()) return { ok: false, skipped: true, reason: "not_configured" };
  const phone = String(to || "").replace(/[^0-9]/g, "");
  if (!phone || !templateCode) return { ok: false, skipped: true, reason: "no_phone_or_template" };

  const serviceId = process.env.NCP_SENS_ALIMTALK_SERVICE_ID;
  const accessKey = process.env.NCP_SENS_ACCESS_KEY;
  const secretKey = process.env.NCP_SENS_SECRET_KEY;
  const uri = `/alimtalk/v2/services/${encodeURIComponent(serviceId)}/messages`;
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`POST ${uri}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const res = await fetch(`${SENS_HOST}${uri}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": accessKey,
      "x-ncp-apigw-signature-v2": signature,
    },
    body: JSON.stringify({
      plusFriendId: process.env.KAKAO_CHANNEL_ID,
      templateCode,
      messages: [
        {
          to: phone,
          content,
          ...(buttons && buttons.length ? { buttons } : {}),
          // 알림톡 실패 시 SMS 대체발송은 SENS 콘솔 설정을 따름
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.status === 202, status: res.status, data };
}
