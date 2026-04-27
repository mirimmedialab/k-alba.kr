/**
 * K-ALBA B2B 이메일 아웃리치 기본 템플릿
 *
 * 사용 방법:
 *   1. 관리자 페이지(/admin/campaigns)에서 새 캠페인 생성
 *   2. subject + body_html 에 아래 템플릿 복사
 *   3. 변수 {{company_name}}, {{contact_name}} 는 발송 시 자동 치환
 *   4. 법적 필수 footer(수신거부 링크 + 발송자 정보)는 자동 추가
 *
 * 🚨 법률 리마인더:
 *   - 제목에는 "(광고)" 접두어가 발송 시 자동 추가됨
 *   - 수신거부 링크는 발송 API에서 자동 삽입
 *   - 본문은 간결하게, 한 화면 안에 끝나는 분량으로
 */

export const EMAIL_TEMPLATE_WORKNET_INTRO = {
  name: "워크넷 발굴 사업자 - K-ALBA 소개",
  subject: "외국인 알바생을 찾으시나요? · 워크넷 공고 참고하여 연락드립니다",
  body_html: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>K-ALBA 소개</title>
</head>
<body style="margin:0;padding:0;font-family:'Pretendard','Apple SD Gothic Neo',-apple-system,sans-serif;background:#F7F5F0;color:#0A1628;line-height:1.6;">

<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <!-- 로고 영역 -->
  <div style="width:40px;height:3px;background:#B8944A;margin-bottom:18px;"></div>
  <div style="font-size:11px;font-weight:700;color:#6B7A95;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">
    K-ALBA · 외국인 알바 플랫폼
  </div>

  <!-- 헤더 -->
  <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.025em;color:#0A1628;margin:0 0 20px;line-height:1.3;">
    {{company_name}}님, 안녕하세요.
  </h1>

  <!-- 본문 -->
  <p style="font-size:14px;color:#3F5273;margin:0 0 14px;line-height:1.7;">
    워크넷에 올리신 구인 공고를 보고 연락드립니다. 미림미디어랩 주식회사가 운영하는 <strong style="color:#0A1628;">K-ALBA</strong>는 한국에 거주하는 <strong style="color:#C2512A;">260만 외국인</strong>을 대상으로 하는 합법적 알바 매칭 플랫폼입니다.
  </p>

  <p style="font-size:14px;color:#3F5273;margin:0 0 20px;line-height:1.7;">
    <strong style="color:#0A1628;">E-9, H-2, D-2 비자 등 합법 취업 가능한 외국인</strong>에게만 공고를 노출하기 때문에, 비자 문제없이 정식으로 채용하실 수 있습니다.
  </p>

  <!-- 3가지 장점 카드 -->
  <div style="background:#FFFFFF;border:1px solid #D9D4C7;border-radius:4px;padding:20px;margin-bottom:20px;">

    <div style="padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #F7F5F0;">
      <div style="font-size:13px;font-weight:800;color:#0A1628;margin-bottom:4px;letter-spacing:-0.01em;">
        ✓ 비자 자동 필터링
      </div>
      <div style="font-size:12px;color:#3F5273;line-height:1.6;">
        귀사의 공고에 적합한 비자를 가진 외국인에게만 노출됩니다. 불법 취업 걱정 없음.
      </div>
    </div>

    <div style="padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #F7F5F0;">
      <div style="font-size:13px;font-weight:800;color:#0A1628;margin-bottom:4px;letter-spacing:-0.01em;">
        ✓ 카카오톡 챗봇 계약서
      </div>
      <div style="font-size:12px;color:#3F5273;line-height:1.6;">
        합격 후 3분이면 법무법인 감수 받은 표준 근로계약서가 자동 생성됩니다.
      </div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:800;color:#0A1628;margin-bottom:4px;letter-spacing:-0.01em;">
        ✓ 7개 언어 지원
      </div>
      <div style="font-size:12px;color:#3F5273;line-height:1.6;">
        외국인 근로자와 언어 장벽 없이 소통하실 수 있습니다.
      </div>
    </div>

  </div>

  <!-- CTA -->
  <div style="text-align:center;margin:28px 0;">
    <a href="https://k-alba.kr/signup?utm_source=email&utm_campaign=worknet_intro" style="display:inline-block;padding:14px 28px;background:#0A1628;color:#B8944A;text-decoration:none;font-weight:700;font-size:14px;border-radius:4px;letter-spacing:-0.01em;">
      무료로 시작하기 →
    </a>
  </div>

  <p style="font-size:12px;color:#6B7A95;text-align:center;margin:20px 0 0;">
    사장님 가입 · 공고 등록 · 계약서 작성 모두 <strong>무료</strong>
  </p>

  <p style="font-size:13px;color:#3F5273;margin:24px 0 0;line-height:1.7;">
    궁금한 점이 있으시면 언제든 회신 주세요. 직접 설명드리겠습니다.<br>
    좋은 하루 되세요.
  </p>

  <p style="font-size:13px;color:#3F5273;margin:16px 0 0;line-height:1.7;">
    감사합니다.<br>
    <strong style="color:#0A1628;">남기환</strong> · 미림미디어랩 주식회사 대표
  </p>

</div>

</body>
</html>`,
  body_text: `K-ALBA · 외국인 알바 플랫폼

{{company_name}}님, 안녕하세요.

워크넷에 올리신 구인 공고를 보고 연락드립니다. 미림미디어랩 주식회사가 운영하는 K-ALBA는 한국에 거주하는 260만 외국인을 대상으로 하는 합법적 알바 매칭 플랫폼입니다.

E-9, H-2, D-2 비자 등 합법 취업 가능한 외국인에게만 공고를 노출하기 때문에, 비자 문제없이 정식으로 채용하실 수 있습니다.

주요 장점:
✓ 비자 자동 필터링
✓ 카카오톡 챗봇 계약서 (3분)
✓ 7개 언어 지원

무료로 시작하기: https://k-alba.kr/signup

사장님 가입 · 공고 등록 · 계약서 작성 모두 무료

궁금한 점이 있으시면 언제든 회신 주세요.

감사합니다.
남기환 · 미림미디어랩 주식회사 대표
`,
};

/**
 * 농업 사장님 특화 템플릿 (AgriWork 발굴)
 */
export const EMAIL_TEMPLATE_AGRIWORK_INTRO = {
  name: "농업 사장님 - K-ALBA 소개",
  subject: "농번기 일손 · E-9 외국인 근로자 매칭 서비스",
  body_html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:'Pretendard','Apple SD Gothic Neo',sans-serif;background:#F7F5F0;color:#0A1628;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">
  <div style="width:40px;height:3px;background:#B8944A;margin-bottom:18px;"></div>
  <div style="font-size:11px;font-weight:700;color:#6B7A95;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;">
    K-ALBA · 농업 특화 서비스
  </div>

  <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.025em;margin:0 0 20px;line-height:1.3;">
    {{company_name}}님, 농번기 일손 걱정되시죠?
  </h1>

  <p style="font-size:14px;color:#3F5273;margin:0 0 14px;line-height:1.7;">
    AgriWork에 올리신 공고 보고 연락드립니다. <strong>K-ALBA</strong>는 E-9 외국인 근로자와 농업 사장님을 연결하는 전문 플랫폼입니다.
  </p>

  <div style="background:#FFFFFF;border-left:3px solid #B8944A;padding:16px 20px;margin:20px 0;">
    <div style="font-size:13px;font-weight:800;color:#0A1628;margin-bottom:8px;">🏠 숙식 제공 공고 우선 매칭</div>
    <div style="font-size:12px;color:#3F5273;line-height:1.6;">
      E-9 근로자는 숙식 여부가 거리보다 중요합니다. 귀농장 공고에 숙식 제공 표시를 하면 지원자가 3배 늘어납니다.
    </div>
  </div>

  <div style="text-align:center;margin:28px 0;">
    <a href="https://k-alba.kr/signup?utm_source=email&utm_campaign=agriwork" style="display:inline-block;padding:14px 28px;background:#0A1628;color:#B8944A;text-decoration:none;font-weight:700;font-size:14px;border-radius:4px;">
      무료로 시작하기 →
    </a>
  </div>

  <p style="font-size:13px;color:#3F5273;line-height:1.7;">
    감사합니다.<br>
    <strong style="color:#0A1628;">남기환</strong> · 미림미디어랩 주식회사
  </p>
</div>
</body>
</html>`,
  body_text: "K-ALBA · 농업 특화 서비스\n\n{{company_name}}님, 농번기 일손 걱정되시죠?\n\nAgriWork 공고 보고 연락드립니다. K-ALBA는 E-9 외국인 근로자와 농업 사장님을 연결합니다.\n\n숙식 제공 공고는 지원자 3배 증가합니다.\n\nhttps://k-alba.kr/signup\n\n감사합니다.\n남기환 · 미림미디어랩",
};
